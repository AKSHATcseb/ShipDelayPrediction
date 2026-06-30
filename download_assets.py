import os
import urllib.request
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("downloader")

assets = {
    "backend/static/assets/tailwind.min.js": "https://cdn.tailwindcss.com",
    "backend/static/assets/fontawesome/css/all.min.css": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
    "backend/static/assets/fontawesome/webfonts/fa-solid-900.woff2": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2",
    "backend/static/assets/fontawesome/webfonts/fa-solid-900.ttf": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.ttf",
    "backend/static/assets/fontawesome/webfonts/fa-regular-400.woff2": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2",
    "backend/static/assets/fontawesome/webfonts/fa-regular-400.ttf": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.ttf",
    "backend/static/assets/fontawesome/webfonts/fa-brands-400.woff2": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2",
    "backend/static/assets/fontawesome/webfonts/fa-brands-400.ttf": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.ttf"
}

def main():
    logger.info("Initializing offline assets download...")
    for path, url in assets.items():
        dir_name = os.path.dirname(path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        
        logger.info(f"Downloading {url} to {path}...")
        try:
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req) as response:
                with open(path, 'wb') as out_file:
                    out_file.write(response.read())
            logger.info(f"Successfully saved {path}")
        except Exception as e:
            logger.error(f"Failed to download {url}: {e}")
            
    logger.info("Asset download complete.")

if __name__ == "__main__":
    main()
