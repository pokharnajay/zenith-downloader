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
            format_id = data.get('format_id')  # 'video' or 'audio'

            if not url or not format_id:
                self.send_error_response(400, 'URL and format_id are required')
                return

            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
            }

            if format_id == 'video':
                # Best video + best audio, prefer 60fps if available
                ydl_opts['format'] = 'bestvideo[fps>=60]+bestaudio/bestvideo+bestaudio/best'
            elif format_id == 'audio':
                # Best audio only
                ydl_opts['format'] = 'bestaudio/best'
            else:
                self.send_error_response(400, 'Invalid format_id. Use "video" or "audio"')
                return

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                # Get the selected format info
                if 'requested_formats' in info:
                    # Video + Audio merge case
                    video_format = info['requested_formats'][0]
                    audio_format = info['requested_formats'][1] if len(info['requested_formats']) > 1 else None

                    video_url = video_format.get('url')
                    audio_url = audio_format.get('url') if audio_format else None
                    ext = video_format.get('ext', 'mp4')
                    needs_merge = audio_url is not None
                else:
                    # Single format (audio only or combined video+audio)
                    video_url = info.get('url')
                    audio_url = None
                    ext = info.get('ext', 'mp4' if format_id == 'video' else 'mp3')
                    needs_merge = False

                response_data = {
                    'video_url': video_url,
                    'audio_url': audio_url,
                    'title': info.get('title', 'video'),
                    'ext': ext,
                    'needs_merge': needs_merge
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
