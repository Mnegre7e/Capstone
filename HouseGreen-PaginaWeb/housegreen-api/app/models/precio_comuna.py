from sqlalchemy import BigInteger, Column, Date, ForeignKey, Integer, Numeric, String, Text, TIMESTAMP, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class ComunaMarketPrice(Base):
    # Paso 120a: precio típico (mediana) de las propiedades EN VENTA en cada comuna, por tipo de propiedad.
    # Lo publica PropiedadesYa (propiedadesya.com/mercado/<comuna>) y la carga automática lo actualiza cada semana.
    # Una fila por comuna y tipo (la más reciente).
    __tablename__ = "comuna_market_prices"
    __table_args__ = (UniqueConstraint("comuna_id", "kind", name="uq_comuna_market_prices_comuna_kind"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    comuna_id = Column(Integer, ForeignKey("comunas.id"), nullable=False)
    kind = Column(String(40), nullable=False)  # "departamento", "casa", "oficina", "local comercial", "terreno"...
    label = Column(String(60), nullable=False)  # como lo escribe la fuente: "Departamentos", "Casas"...
    median_uf = Column(Numeric(12, 1), nullable=False)  # precio mediano en UF
    median_clp = Column(Numeric(14, 0), nullable=False)  # el mismo precio en pesos (la fuente usa la UF del día)
    uf_m2_p25 = Column(Numeric(8, 1))  # UF por m²: percentil 25, mediana y percentil 75
    uf_m2_median = Column(Numeric(8, 1))
    uf_m2_p75 = Column(Numeric(8, 1))
    median_surface_m2 = Column(Numeric(10, 1))  # superficie mediana de esos avisos
    sample_size = Column(Integer, nullable=False)  # cuántos avisos usó la fuente
    source = Column(String(40), nullable=False, default="PropiedadesYa")
    source_url = Column(Text)
    source_date = Column(Date)  # "Actualizado el 1 de noviembre de 2026"
    fetched_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)