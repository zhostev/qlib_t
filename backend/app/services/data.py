from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.stock_data import StockData
from app.schemas.data import StockDataCreate


def create_stock_data(db: Session, stock_data: StockDataCreate):
    db_stock_data = StockData(**stock_data.model_dump())
    db.add(db_stock_data)
    db.commit()
    db.refresh(db_stock_data)
    return db_stock_data


def get_stock_data(db: Session, data_id: int):
    return db.query(StockData).filter(StockData.id == data_id).first()


def get_stock_data_by_code_and_date(db: Session, stock_code: str, date):
    return db.query(StockData).filter(
        StockData.stock_code == stock_code,
        StockData.date == date
    ).first()


def get_stock_data_list(
    db: Session,
    stock_code: str = None,
    start_date = None,
    end_date = None,
    skip: int = 0,
    limit: int = 100
):
    query = db.query(StockData)
    
    # Apply filters
    filters = []
    if stock_code:
        filters.append(StockData.stock_code == stock_code)
    if start_date:
        filters.append(StockData.date >= start_date)
    if end_date:
        filters.append(StockData.date <= end_date)
    
    if filters:
        query = query.filter(and_(*filters))
    
    # Get total count
    total = query.count()
    
    # Apply pagination and sorting
    data = query.order_by(StockData.date.desc()).offset(skip).limit(limit).all()
    
    return data, total


def get_stock_codes(db: Session):
    return db.query(StockData.stock_code).distinct().all()
