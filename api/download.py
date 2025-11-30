from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error


COBALT_API_URL = 'https://api.cobalt.tools/api/json'


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
            format_id = data.get('format_id')  # This is the quality like "1080", "720"

            if not url or not format_id:
                self.send_error_response(400, 'URL and format_id are required')
                return

            # Map quality to Cobalt's vQuality parameter
            quality_map = {
                '1080': '1080',
                '720': '720',
                '480': '480',
                '360': '360',
            }

            v_quality = quality_map.get(format_id, '720')

            # Call Cobalt API
            cobalt_payload = json.dumps({
                'url': url,
                'vQuality': v_quality,
                'filenamePattern': 'basic',
                'isAudioOnly': False,
            }).encode('utf-8')

            req = urllib.request.Request(
                COBALT_API_URL,
                data=cobalt_payload,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                method='POST'
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                cobalt_data = json.loads(response.read().decode())

            # Cobalt returns different response types
            status = cobalt_data.get('status')

            if status == 'error':
                self.send_error_response(400, cobalt_data.get('text', 'Cobalt API error'))
                return

            if status == 'redirect' or status == 'stream':
                download_url = cobalt_data.get('url')
            elif status == 'picker':
                # Multiple options, take the first video
                picker = cobalt_data.get('picker', [])
                if picker:
                    download_url = picker[0].get('url')
                else:
                    self.send_error_response(400, 'No download URL found')
                    return
            else:
                download_url = cobalt_data.get('url')

            if not download_url:
                self.send_error_response(400, 'No download URL returned from Cobalt')
                return

            response_data = {
                'video_url': download_url,
                'audio_url': None,
                'title': 'video',
                'ext': 'mp4',
                'needs_merge': False
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode())

        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else str(e)
            self.send_error_response(e.code, f'Cobalt API error: {error_body}')
        except urllib.error.URLError as e:
            self.send_error_response(500, f'Network error: {str(e)}')
        except Exception as e:
            self.send_error_response(500, str(e))

    def send_error_response(self, status, message):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode())
