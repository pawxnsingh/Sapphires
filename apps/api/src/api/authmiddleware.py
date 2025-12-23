import os
import jwt
from fastapi import Request
from fastapi.responses import JSONResponse


async def auth_middleware(request: Request, call_next):
    # print(request)
    auth_header = request.headers.get("authorization")
    token = None
    if auth_header:
        parts = auth_header.split(" ")
        if len(parts) == 2:
            token = parts[1]

    print("token from backend: ", token)

    if not token:
        return JSONResponse(status_code=401, content={"message": "token missing"})

    public_key = os.environ.get("JWT_PUBLIC_KEY")
    print(public_key)  

    try:
        payload = jwt.decode(token, public_key, algorithms=["RS256"])

        if not payload:
            return JSONResponse(status_code=401, content={"message": "unauthorized"})

        # print(payload)

        user_id = payload.get("sub")
        if not user_id:
            return JSONResponse(status_code=401, content={"message": "unauthorized"})

        # Attach user_id to request state
        request.state.user_id = user_id

        response = await call_next(request)
        return response
 
    except Exception as e:
        print(f"Auth Middleware Error: {e}")
        return JSONResponse(status_code=401, content={"message": "unauthorized"})
