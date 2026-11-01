from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

class DefinitionItem(BaseModel):
    term: str
    definition: str

class FormulaItem(BaseModel):
    name: str
    expression: str
    note: Optional[str] = None

class RevisionQuestionItem(BaseModel):
    question: str
    answer_hint: str

class FlashcardItem(BaseModel):
    front: str
    back: str

class NoteSummaryContent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key_takeaways: List[str] = Field(..., min_length=3, max_length=7, description="Key takeaways, target 5")
    definitions: List[DefinitionItem] = Field(default_factory=list)
    formulas: List[FormulaItem] = Field(default_factory=list)
    revision_questions: List[RevisionQuestionItem] = Field(..., min_length=2, max_length=5, description="Target 3 questions")
    flashcards: List[FlashcardItem] = Field(..., min_length=5, max_length=15, description="8 to 12 flashcards")

class NoteSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    note_id: int
    content_hash: str
    provider_model: str
    cached: bool
    summary: NoteSummaryContent
    xp_earned: int = 0

