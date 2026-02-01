#!/usr/bin/env python3

import os
import sys
import base64
import re
import io
import requests
from datetime import datetime
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv
from pypdf import PdfReader

load_dotenv()

def fetch_pdf_content(url):
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"Error fetching PDF: {e}")
        sys.exit(1)

def check_pdf_page_count(pdf_content, max_pages=25):
    """Check if PDF has more pages than desired limit."""
    try:
        pdf_file = io.BytesIO(pdf_content)
        pdf_reader = PdfReader(pdf_file)
        page_count = len(pdf_reader.pages)
        print(f"PDF has {page_count} pages (max allowed: {max_pages})")

        if page_count > max_pages:
            print(f"WARNING: PDF exceeds {max_pages} page limit!")
            print(f"   Skipping papers over {max_pages} pages to save costs and focus on concise research.")
            print(f"   This paper has {page_count} pages.")
            return False, page_count

        return True, page_count
    except Exception as e:
        print(f"Warning: Could not check PDF page count: {e}")
        # Allow processing to continue if we can't check page count
        return True, None

def load_read_paper_prompt():
    try:
        with open("prompts/read_paper.txt", "r") as f:
            content = f.read()
            lines = content.split('\n')
            filtered_lines = [line for line in lines if not line.strip().startswith('http')]
            return '\n'.join(filtered_lines).strip()
    except FileNotFoundError:
        print("Error: prompts/read_paper.txt not found")
        print("Please create the prompts directory and add your prompt template.")
        sys.exit(1)

def load_humanizer_prompt():
    try:
        with open("prompts/humanize.txt", "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        print("Error: prompts/humanize.txt not found")
        print("Please create the prompts directory and add your humanizer prompt.")
        sys.exit(1)

def extract_paper_id(url):
    """Extract a meaningful identifier from the paper URL"""
    # arXiv papers
    arxiv_match = re.search(r'arxiv\.org/(?:abs|pdf)/(\d+\.\d+)', url)
    if arxiv_match:
        return f"arxiv-{arxiv_match.group(1)}"

    # DOI-based URLs
    doi_match = re.search(r'doi\.org/(10\.\d+/[^\s]+)', url)
    if doi_match:
        doi = doi_match.group(1).replace('/', '-')
        return f"doi-{doi}"

    # Extract filename from URL
    filename_match = re.search(r'/([^/]+)\.pdf$', url)
    if filename_match:
        return filename_match.group(1)

    # Fallback: use timestamp
    return f"paper-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

def create_output_directory(paper_url):
    """Create organized output directory structure"""
    paper_id = extract_paper_id(paper_url)
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')

    # Structure: outputs/YYYY-MM-DD/paper-id_HH-MM-SS/
    output_dir = Path("outputs") / datetime.now().strftime('%Y-%m-%d') / f"{paper_id}_{timestamp.split('_')[1]}"
    output_dir.mkdir(parents=True, exist_ok=True)

    return output_dir, paper_id

def generate_text_from_paper(pdf_url, api_key, max_pages=25, prompts_dir="prompts"):
    print("Process Start")

    client = Anthropic(api_key=api_key)

    print("Loading read_paper_prompt")
    with open(f"{prompts_dir}/read_paper.txt", "r") as f:
        content = f.read()
        lines = content.split('\n')
        filtered_lines = [line for line in lines if not line.strip().startswith('http')]
        prompt_template = '\n'.join(filtered_lines).strip()

    print("Fetching paper content")
    pdf_content = fetch_pdf_content(pdf_url)

    print("Checking PDF page count")
    is_valid, page_count = check_pdf_page_count(pdf_content, max_pages)

    if not is_valid:
        raise ValueError(f"Paper exceeds {max_pages}-page limit (has {page_count} pages)")

    print("Anthropic API call")
    message = client.messages.create(
        model="claude-opus-4-5-20251101",
        max_tokens=16000,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": base64.standard_b64encode(pdf_content).decode('utf-8')
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt_template
                    }
                ]
            }
        ]
    )

    generated_text = message.content[0].text
    opus_input_tokens = message.usage.input_tokens
    opus_output_tokens = message.usage.output_tokens

    print(f"Generated {len(generated_text)} characters")
    return generated_text, page_count, opus_input_tokens, opus_output_tokens

def humanize_text(text, api_key, prompts_dir="prompts"):
    print("\nStep 2: Humanizing the text...")

    client = Anthropic(api_key=api_key)

    with open(f"{prompts_dir}/humanize.txt", "r") as f:
        humanizer_prompt_template = f.read().strip()

    if "{text}" in humanizer_prompt_template:
        humanizer_prompt = humanizer_prompt_template.format(text=text)
    else:
        humanizer_prompt = f"{humanizer_prompt_template}\n\n---\n\n{text}"

    message = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=16000,
        messages=[
            {
                "role": "user",
                "content": humanizer_prompt
            }
        ]
    )

    humanized_text = message.content[0].text
    sonnet_input_tokens = message.usage.input_tokens
    sonnet_output_tokens = message.usage.output_tokens

    print(f"Humanized to {len(humanized_text)} characters")
    return humanized_text, sonnet_input_tokens, sonnet_output_tokens

def main():
    if len(sys.argv) < 2:
        print("Usage: python process_paper.py <paper_url>")
        print("Example: python process_paper.py https://arxiv.org/pdf/2512.24601")
        sys.exit(1)

    paper_url = sys.argv[1]

    if not paper_url.endswith('.pdf'):
        if 'arxiv.org/abs/' in paper_url:
            paper_url = paper_url.replace('/abs/', '/pdf/') + '.pdf'
        elif not paper_url.endswith('.pdf'):
            paper_url += '.pdf'

    # Create organized output directory
    output_dir, paper_id = create_output_directory(paper_url)

    print(f"Processing paper: {paper_url}")
    print(f"Output directory: {output_dir}\n")

    # Step 1: Generate text from paper
    generated_text = generate_text_from_paper(paper_url)

    # Save intermediate output
    intermediate_file = output_dir / f"{paper_id}_1_generated.md"
    with open(intermediate_file, "w") as f:
        f.write(generated_text)
    print(f"Saved generated text to: {intermediate_file}")

    # Step 2: Humanize the text
    final_text = humanize_text(generated_text)

    # Save final output
    final_file = output_dir / f"{paper_id}_2_final.md"
    with open(final_file, "w") as f:
        f.write(final_text)

    # Save paper URL for reference
    metadata_file = output_dir / "metadata.txt"
    with open(metadata_file, "w") as f:
        f.write(f"Paper URL: {paper_url}\n")
        f.write(f"Paper ID: {paper_id}\n")
        f.write(f"Processed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    print(f"\nComplete! Files saved to: {output_dir}/")
    print(f"  - Intermediate: {intermediate_file.name}")
    print(f"  - Final: {final_file.name}")
    print(f"  - Metadata: {metadata_file.name}")

if __name__ == "__main__":
    main()
