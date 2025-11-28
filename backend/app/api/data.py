from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from app.db.database import get_db
from app.models.user import User
from app.schemas.data import StockDataResponse, DataResponse
from app.services.data import get_stock_data, get_stock_data_list, get_stock_codes
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/", response_model=DataResponse)
def read_stock_data(
    stock_code: Optional[str] = Query(None, description="Stock code to filter by"),
    start_date: Optional[date] = Query(None, description="Start date for filtering"),
    end_date: Optional[date] = Query(None, description="End date for filtering"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(100, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    skip = (page - 1) * per_page
    data, total = get_stock_data_list(
        db=db,
        stock_code=stock_code,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=per_page
    )
    
    return {
        "data": data,
        "total": total,
        "page": page,
        "per_page": per_page
    }

@router.get("/stock-codes", response_model=List[str])
def read_stock_codes(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    stock_codes = get_stock_codes(db=db)
    return [code[0] for code in stock_codes]

@router.get("/{data_id}", response_model=StockDataResponse)
def read_stock_data_detail(
    data_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_data = get_stock_data(db=db, data_id=data_id)
    if db_data is None:
        raise HTTPException(status_code=404, detail="Stock data not found")
    return db_data
