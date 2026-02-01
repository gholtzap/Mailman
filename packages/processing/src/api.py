from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from process_paper import generate_text_from_paper, humanize_text
import os

app = FastAPI()

class ProcessPaperRequest(BaseModel):
    pdf_url: str
    api_key: str
    max_pages: int = 50

class ProcessPaperResponse(BaseModel):
    generated_content: str
    humanized_content: str
    page_count: int
    opus_input_tokens: int
    opus_output_tokens: int
    sonnet_input_tokens: int
    sonnet_output_tokens: int
    estimated_cost_usd: float

@app.post("/process-paper", response_model=ProcessPaperResponse)
async def process_paper(request: ProcessPaperRequest):
    try:
        prompts_dir = os.path.join(os.path.dirname(__file__), "..", "prompts")
        
        generated_text, page_count, opus_in, opus_out = generate_text_from_paper(
            request.pdf_url,
            request.api_key,
            request.max_pages,
            prompts_dir
        )
        
        humanized_text, sonnet_in, sonnet_out = humanize_text(
            generated_text,
            request.api_key,
            prompts_dir
        )
        
        opus_cost = (opus_in / 1_000_000 * 15.00) + (opus_out / 1_000_000 * 75.00)
        sonnet_cost = (sonnet_in / 1_000_000 * 3.00) + (sonnet_out / 1_000_000 * 15.00)
        total_cost = opus_cost + sonnet_cost
        
        return ProcessPaperResponse(
            generated_content=generated_text,
            humanized_content=humanized_text,
            page_count=page_count or 0,
            opus_input_tokens=opus_in,
            opus_output_tokens=opus_out,
            sonnet_input_tokens=sonnet_in,
            sonnet_output_tokens=sonnet_out,
            estimated_cost_usd=round(total_cost, 4)
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/health")
async def health():
    return {"status": "ok"}
