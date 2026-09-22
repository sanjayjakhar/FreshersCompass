import io
import re
import pypdf
import docx

def extract_social_links(raw_text: str, urls: list[str] = None) -> dict:
    """Deterministic regex extraction for GitHub and LinkedIn profiles."""
    if urls is None:
        urls = []
    
    combined_content = raw_text + "\n" + "\n".join(urls)
    
    # 1. GitHub username and URL
    github_match = re.search(r'(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_\-]+)(?:\/[a-zA-Z0-9_\-]+)?', combined_content, re.IGNORECASE)
    github_username = ""
    github_url = ""
    if github_match:
        extracted = github_match.group(1).strip()
        # Avoid generic terms
        if extracted.lower() not in ['login', 'signup', 'features', 'pricing', 'about', 'join']:
            github_username = extracted
            github_url = f"https://github.com/{github_username}"

    # 2. LinkedIn URL
    linkedin_match = re.search(r'(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\-%]+)', combined_content, re.IGNORECASE)
    linkedin_url = ""
    if linkedin_match:
        slug = linkedin_match.group(1).strip()
        linkedin_url = f"https://www.linkedin.com/in/{slug}"

    return {
        "github_username": github_username,
        "github_url": github_url,
        "linkedin_url": linkedin_url
    }

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    text = ""
    file_extension = filename.split(".")[-1].lower()
    extracted_urls = set()

    try:
        if file_extension == "pdf":
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                # 1. Plain text
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
                
                # 2. Hyperlink annotations (e.g. GitHub/LinkedIn buttons/links)
                if "/Annots" in page and page["/Annots"]:
                    try:
                        for annot in page["/Annots"]:
                            obj = annot.get_object()
                            if obj and "/A" in obj and "/URI" in obj["/A"]:
                                uri = str(obj["/A"]["/URI"]).strip()
                                if uri:
                                    extracted_urls.add(uri)
                    except Exception as annot_err:
                        print(f"Warning extracting PDF annotation: {annot_err}")

        elif file_extension == "docx":
            doc = docx.Document(io.BytesIO(file_bytes))
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            # Extract docx hyperlinks from relationships
            try:
                for rel in doc.part.rels.values():
                    if "hyperlink" in rel.reltype.lower() and hasattr(rel, "target_ref"):
                        if rel.target_ref:
                            extracted_urls.add(str(rel.target_ref).strip())
            except Exception as docx_err:
                print(f"Warning extracting DOCX hyperlinks: {docx_err}")

        else:
            raise ValueError("Unsupported file format")

    except Exception as e:
        print(f"Error parsing file: {e}")
        raise ValueError("Failed to extract text from file")

    if extracted_urls:
        text += "\n\n--- DETECTED HYPERLINKS IN RESUME ---\n"
        for url in sorted(extracted_urls):
            text += f"- {url}\n"
        
    return text.strip()

