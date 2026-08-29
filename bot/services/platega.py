import hashlib
import aiohttp
from bot.config import PLATEGA_API_URL, PLATEGA_MERCHANT_ID, PLATEGA_SECRET, WEBHOOK_URL


class Platega:
    def __init__(self):
        self.url = PLATEGA_API_URL
        self.merchant_id = PLATEGA_MERCHANT_ID
        self.secret = PLATEGA_SECRET

    def _sign(self, data: dict) -> str:
        sorted_keys = sorted(data.keys())
        sign_string = "&".join(f"{k}={data[k]}" for k in sorted_keys) + self.secret
        return hashlib.sha256(sign_string.encode()).hexdigest()

    async def create_payment(self, order_id: str, amount: int, description: str, user_id: int) -> dict:
        payload = {
            "merchant_id": self.merchant_id,
            "order_id": order_id,
            "amount": amount,
            "currency": "RUB",
            "description": description,
            "success_url": f"{WEBHOOK_URL}/payment/success",
            "fail_url": f"{WEBHOOK_URL}/payment/fail",
            "callback_url": f"{WEBHOOK_URL}/webhook/platega",
        }
        payload["signature"] = self._sign(payload)

        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.url}/payments", json=payload) as resp:
                return await resp.json()

    def verify_signature(self, data: dict, signature: str) -> bool:
        calculated = self._sign(data)
        return calculated == signature


platega = Platega()
