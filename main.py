# main.py
import uvicorn
from fastapi import FastAPI, Request
from app.api import (
    add_weapon,
    add_intention,
    assign_weapon,
    assign_intention,
    return_intention,
    return_all_items,
    send_item,
    recieve_item
)
app = FastAPI()

@app.on_event("startup")
def startup_event():
    print("startup")
    # initialize_data()

# Include routes from each API file
app.include_router(add_weapon.router, prefix="/weapon-types", tags=["Weapon-types"])
app.include_router(add_intention.router, prefix="/intention-types", tags=["Intention Types"])
app.include_router(assign_weapon.router, prefix="/assign-weapon", tags=["Assign"])
app.include_router(assign_intention.router, prefix="/assign-intention", tags=["Assign"])
app.include_router(return_intention.router, prefix="/return-intention", tags=["Return"])
app.include_router(return_all_items.router, prefix="/return-all", tags=["Return All"])
app.include_router(send_item.router, prefix="/send-item", tags=["Send Item"])
app.include_router(recieve_item.router, prefix="/recieve-item", tags=["Send Item"])

@app.get("/")
def root():
    return {"message": "Armory Backend is running"}