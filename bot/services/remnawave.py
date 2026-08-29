import aiohttp
from bot.config import REMNAWAVE_API_URL, REMNAWAVE_API_TOKEN


class Remnawave:
    def __init__(self):
        self.url = REMNAWAVE_API_URL
        self.headers = {
            "Authorization": f"Bearer {REMNAWAVE_API_TOKEN}",
            "Content-Type": "application/json",
        }

    async def create_user(self, username: str, traffic_gb: int, expiry_days: int, sub_id: str):
        import time
        expiry = int(time.time()) + expiry_days * 86400

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.url}/users",
                json={
                    "username": username,
                    "traffic_limit_bytes": traffic_gb * 1024 * 1024 * 1024,
                    "expiry_time": expiry,
                    "sub_id": sub_id,
                },
                headers=self.headers,
            ) as resp:
                return await resp.json()

    async def get_user(self, uuid: str):
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.url}/users/{uuid}", headers=self.headers) as resp:
                return await resp.json()

    async def extend_user(self, uuid: str, days: int):
        user = await self.get_user(uuid)
        current_expiry = user.get("expiry_time", 0)
        new_expiry = current_expiry + days * 86400

        async with aiohttp.ClientSession() as session:
            async with session.put(
                f"{self.url}/users/{uuid}",
                json={"expiry_time": new_expiry},
                headers=self.headers,
            ) as resp:
                return await resp.json()

    async def delete_user(self, uuid: str):
        async with aiohttp.ClientSession() as session:
            async with session.delete(f"{self.url}/users/{uuid}", headers=self.headers) as resp:
                return resp.status == 200

    def get_subscription_url(self, uuid: str, sub_id: str) -> str:
        base = self.url.replace("/api", "")
        return f"{base}/sub/{sub_id}/{uuid}"


remnawave = Remnawave()
