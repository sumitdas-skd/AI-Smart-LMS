import requests
from bs4 import BeautifulSoup
from typing import Dict, Any

class BaseParser:
    @staticmethod
    def parse_page(url: str) -> Dict[str, Any]:
        """
        Parses exactly what is requested: title, description/snippet
        Only handles basic HTML extraction
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Title extraction
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.h1:
            title = soup.h1.get_text(strip=True)
            
        # Description extraction (meta or first paragraph)
        description = ""
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            description = meta_desc["content"].strip()
        else:
            p = soup.find('p')
            if p:
                description = p.get_text(strip=True)[:255] # limits to avoid massive text

        # Finding any potential PDF or resource link
        file_url = None
        for a in soup.find_all('a', href=True):
            if a['href'].endswith('.pdf'):
                file_url = a['href']
                if not file_url.startswith('http'):
                    from urllib.parse import urljoin
                    file_url = urljoin(url, file_url)
                break
                
        # Basic Subject inference (fallback)
        detected_subject = "General Education"
        return {
            "title": title or "Untitled Resource",
            "description": description,
            "file_url": file_url,
            "detected_subject": detected_subject
        }
