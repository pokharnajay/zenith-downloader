from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error


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

            # Extract video ID from YouTube URL
            video_id = None
            if 'youtube.com/watch' in url:
                video_id = url.split('v=')[1].split('&')[0]
            elif 'youtu.be/' in url:
                video_id = url.split('youtu.be/')[1].split('?')[0]

            if not video_id:
                self.send_error_response(400, 'Invalid YouTube URL')
                return

            # Get video info from YouTube oEmbed API (no auth needed)
            oembed_url = f'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json'

            req = urllib.request.Request(oembed_url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })

            with urllib.request.urlopen(req) as response:
                oembed_data = json.loads(response.read().decode())

            # Build metadata from oEmbed
            metadata = {
                'title': oembed_data.get('title', 'Unknown Title'),
                'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
                'duration': 'Unknown'  # oEmbed doesn't provide duration
            }

            # Provide standard quality options (Cobalt will handle the actual download)
            qualities = [
                {'id': '1080', 'resolution': '1080p', 'fps': 30, 'ext': 'mp4', 'size': 'Unknown', 'note': None},
                {'id': '720', 'resolution': '720p', 'fps': 30, 'ext': 'mp4', 'size': 'Unknown', 'note': None},
                {'id': '480', 'resolution': '480p', 'fps': 30, 'ext': 'mp4', 'size': 'Unknown', 'note': None},
                {'id': '360', 'resolution': '360p', 'fps': 30, 'ext': 'mp4', 'size': 'Unknown', 'note': None},
            ]

            response_data = {
                'metadata': metadata,
                'qualities': qualities,
                'video_id': video_id
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode())

        except urllib.error.HTTPError as e:
            self.send_error_response(e.code, f'Failed to fetch video info: {e.reason}')
        except Exception as e:
            self.send_error_response(500, str(e))

    def send_error_response(self, status, message):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode())
