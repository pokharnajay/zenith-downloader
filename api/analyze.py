from http.server import BaseHTTPRequestHandler
import json
import yt_dlp


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            url = data.get('url')

            if not url:
                self.send_error_response(400, 'URL is required')
                return

            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                # Format duration
                duration_secs = info.get('duration', 0)
                if duration_secs:
                    hours = int(duration_secs // 3600)
                    minutes = int((duration_secs % 3600) // 60)
                    secs = int(duration_secs % 60)
                    if hours > 0:
                        duration = f"{hours}:{minutes:02d}:{secs:02d}"
                    else:
                        duration = f"{minutes}:{secs:02d}"
                else:
                    duration = "Unknown"

                metadata = {
                    'title': info.get('title', 'Unknown Title'),
                    'thumbnail': info.get('thumbnail', ''),
                    'duration': duration
                }

                # Simple options: Video or Audio
                qualities = [
                    {
                        'id': 'video',
                        'resolution': 'Video',
                        'fps': 0,
                        'ext': 'mp4',
                        'size': 'Best quality',
                        'note': 'Video + Audio'
                    },
                    {
                        'id': 'audio',
                        'resolution': 'Audio',
                        'fps': 0,
                        'ext': 'mp3',
                        'size': 'Best quality',
                        'note': 'Audio only'
                    }
                ]

            response_data = {
                'metadata': metadata,
                'qualities': qualities
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode())

        except Exception as e:
            self.send_error_response(500, str(e))

    def send_error_response(self, status, message):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode())
