from pydantic import BaseModel


class CategoriaBase(BaseModel):
    nombre: str


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(CategoriaBase):
    pass


class CategoriaOut(CategoriaBase):
    id: int
    orden: int = 0

    class Config:
        from_attributes = True
        orm_mode = True
