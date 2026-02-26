#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json, os, time, shutil, socket

BASE = Path(__file__).resolve().parent
PORT = 8788


def read_cpu_temp():
    try:
        v = Path('/sys/class/thermal/thermal_zone0/temp').read_text().strip()
        return round(int(v) / 1000.0, 1)
    except Exception:
        return None


def mem_stats():
    total = avail = None
    try:
        with open('/proc/meminfo', 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('MemTotal:'):
                    total = int(line.split()[1]) * 1024
                elif line.startswith('MemAvailable:'):
                    avail = int(line.split()[1]) * 1024
        if total and avail is not None:
            used = total - avail
            return {
                'total_gb': round(total / (1024**3), 2),
                'used_gb': round(used / (1024**3), 2),
                'used_pct': round(used / total * 100, 1),
            }
    except Exception:
        pass
    return None


def uptime_human():
    try:
        sec = int(float(Path('/proc/uptime').read_text().split()[0]))
        d, rem = divmod(sec, 86400)
        h, rem = divmod(rem, 3600)
        m, _ = divmod(rem, 60)
        if d > 0:
            return f"{d}d {h}h {m}m"
        return f"{h}h {m}m"
    except Exception:
        return None


def local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/api/pi-status'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            du = shutil.disk_usage('/')
            mem = mem_stats()
            payload = {
                'time': int(time.time()),
                'hostname': os.uname().nodename,
                'cpu_temp_c': read_cpu_temp(),
                'load1': round(os.getloadavg()[0], 2) if hasattr(os, 'getloadavg') else None,
                'mem': mem,
                'disk': {
                    'used_gb': round((du.used) / (1024**3), 1),
                    'total_gb': round((du.total) / (1024**3), 1),
                    'used_pct': round(du.used / du.total * 100, 1),
                },
                'uptime': uptime_human(),
                'ip': local_ip(),
            }
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))
            return

        if self.path in ('/', '/index.html'):
            self.path = '/index.html'
        return super().do_GET()


if __name__ == '__main__':
    httpd = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'weather-station server listening on http://127.0.0.1:{PORT}')
    httpd.serve_forever()
