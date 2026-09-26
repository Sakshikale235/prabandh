from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import CORS_ORIGINS
from .routers import events, health, transport, journeys, operations, resources

app = FastAPI(title='PRABANDH API', version='0.4.0', description='Event intelligence backend — Phase 4 dynamic venue and resource orchestration')
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
app.include_router(health.router, prefix='/api')
app.include_router(events.router, prefix='/api')
app.include_router(transport.router, prefix='/api')
app.include_router(journeys.router, prefix='/api')
app.include_router(operations.router, prefix='/api')
app.include_router(resources.router, prefix='/api')

@app.get('/')
def root():
    return {'name': 'PRABANDH', 'service': 'FastAPI', 'phase': 3, 'status': 'ready'}
