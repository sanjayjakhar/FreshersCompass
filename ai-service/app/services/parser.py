import io
import pypdf
import docx

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    text = ""
    file_extension = filename.split(".")[-1].lower()

    try:
        if file_extension == "pdf":
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        elif file_extension == "docx":
            doc = docx.Document(io.BytesIO(file_bytes))
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
        else:
            raise ValueError("Unsupported file format")
    except Exception as e:
        print(f"Error parsing file: {e}")
        raise ValueError("Failed to extract text from file")
        
    return text.strip()
