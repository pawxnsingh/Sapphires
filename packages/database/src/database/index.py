# from prisma import Prisma

# db = Prisma()


# async def connectDB():
#     print("connecting to database")
#     if not db.is_connected():
#         result = await db.connect()
#         print(result)


# async def disconnectDB():
#     if db.is_connected():
#         await db.disconnect()

import os
from pathlib import Path
from dotenv import load_dotenv
from prisma import Prisma

# Load .env from the root directory
# Go up 5 levels: index.py -> database -> src -> database -> packages -> Sapphires
root_dir = Path(__file__).parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)

db = Prisma()


async def connectDB():
    print("connecting to database")
    if not db.is_connected():
        result = await db.connect()
        print("Database connected successfully!")


async def disconnectDB():
    if db.is_connected():
        await db.disconnect()