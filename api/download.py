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
            format_id = data.get('format_id')

            if not url or not format_id:
                self.send_error_response(400, 'URL and format_id are required')
                return

            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android', 'web'],
                    }
                },
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-us,en;q=0.5',
                    'Sec-Fetch-Mode': 'navigate',
                },
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                # Find the requested format
                formats = info.get('formats', [])
                selected_format = None
                best_audio = None

                for f in formats:
                    if f.get('format_id') == format_id:
                        selected_format = f
                    # Find best audio format
                    if f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                        if best_audio is None or (f.get('abr') or 0) > (best_audio.get('abr') or 0):
                            best_audio = f

                if not selected_format:
                    self.send_error_response(404, 'Format not found')
                    return

                # Get the direct URL
                video_url = selected_format.get('url')
                audio_url = best_audio.get('url') if best_audio else None

                # Check if format has audio
                has_audio = selected_format.get('acodec') != 'none'

                response_data = {
                    'video_url': video_url,
                    'audio_url': audio_url if not has_audio else None,
                    'title': info.get('title', 'video'),
                    'ext': selected_format.get('ext', 'mp4'),
                    'needs_merge': not has_audio and audio_url is not None
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
