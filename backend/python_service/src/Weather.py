from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import httpx

from pathlib import Path
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

OPEN_WEATHER_KEY = os.getenv('OPEN_WEATHER_KEY')

if not OPEN_WEATHER_KEY:
    raise RuntimeError('OPEN_WEATHER_KEY không được cấu hình trong .env')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


class WeatherResponse(BaseModel):
    temp: str
    condition: str
    rain_mm: float
    city: str

@app.get('/api/weather', response_model=WeatherResponse)
async def get_weather(lat: float, lon: float):
    # Giới hạn Việt Nam (tuỳ chọn)
    if not (8.179 <= lat <= 23.393 and 102.144 <= lon <= 109.464):
        raise HTTPException(status_code=400, detail='Chỉ hỗ trợ vị trí trong lãnh thổ Việt Nam.')

    url = (
        'https://api.openweathermap.org/data/2.5/weather'
        f'?lat={lat}&lon={lon}&appid={OPEN_WEATHER_KEY}&units=metric&lang=vi'
    )

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f'Lỗi kết nối OpenWeatherMap: {e}')
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)

    rain_mm = (data.get('rain') or {}).get('1h', 0.0)
    return WeatherResponse(
        temp=f"{data['main']['temp']}°C",
        condition=data['weather'][0]['description'],
        rain_mm=rain_mm,
        city=data.get('name', 'Không rõ')
    )
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

# Chạy:
# python -m uvicorn Weather:app --reload --port 8002
