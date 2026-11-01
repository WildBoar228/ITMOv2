"""Reproducible security checks. Each test fails on the intentionally vulnerable service."""

import json
import unittest

from service import Shop


class SecurityTest(unittest.TestCase):
    def setUp(self):
        self.shop = Shop()
        self.addCleanup(self.shop.close)

    def request(self, method, path, body=None, headers=None):
        with self.shop.lock:
            return self.shop.dispatch(method, path, body or {}, headers or {})

    def login(self, username="alice", password="learn-alice"):
        status, result = self.request("POST", "/login", {"username": username, "password": password})
        self.assertEqual(status, 200)
        return {"X-Token": result["token"]}

    # Spoofing / Elevation of Privilege

    def test_customer_cannot_spoof_staff_role_header(self):
        auth = {**self.login(), "X-Role": "staff"}
        self.assertEqual(self.request("GET", "/admin/export", headers=auth)[0], 403)

    def test_staff_role_comes_from_session_not_header(self):
        auth = {**self.login("staff", "learn-staff"), "X-Role": "customer"}
        status, profiles = self.request("GET", "/admin/export", headers=auth)
        self.assertEqual(status, 200)
        self.assertEqual(len(profiles), 2)

    def test_login_is_rate_limited(self):
        for _ in range(5):
            self.assertEqual(
                self.request("POST", "/login", {"username": "alice", "password": "wrong"})[0], 401
            )
        self.assertEqual(
            self.request("POST", "/login", {"username": "alice", "password": "wrong"})[0], 429
        )

    # Tampering / Injection

    def test_profile_sql_injection_does_not_leak_other_rows(self):
        auth = self.login()
        status, result = self.request(
            "GET",
            "/profile?id=1%20UNION%20SELECT%202,%27LEAK%27,%27x%27,%27y%27",
            headers=auth,
        )
        self.assertNotIn("LEAK", json.dumps(result))
        self.assertNotEqual(status, 200)

    def test_search_injection_is_not_executed(self):
        auth = self.login("staff", "learn-staff")
        status, result = self.request(
            "GET",
            "/search?q=%27%20UNION%20SELECT%202,%27LEAK%27,%27x%27,%27y%27--",
            headers=auth,
        )
        self.assertNotIn("LEAK", json.dumps(result))

    def test_assistant_context_order_id_is_parameterized(self):
        auth = self.login()
        status, result = self.request(
            "GET",
            "/assistant/context?order_id=1%20UNION%20SELECT%2099,%271%27,%27LEAK%27,0",
            headers=auth,
        )
        self.assertNotIn("LEAK", result.get("prompt", ""))

    def test_order_price_cannot_be_set_by_client(self):
        status, order = self.request(
            "POST", "/orders", {"product": "chair", "price": 1}, self.login()
        )
        self.assertEqual(status, 201)
        self.assertEqual(order["price"], 5000)

    def test_review_html_is_escaped(self):
        auth = self.login()
        self.assertEqual(
            self.request(
                "POST", "/reviews", {"product": "chair", "text": "<script>alert(1)</script>"}, auth
            )[0],
            201,
        )
        status, page = self.request("GET", "/reviews/view", headers=auth)
        self.assertNotIn("<script>", page)
        self.assertIn("&lt;script&gt;", page)

    # Information Disclosure / Broken Access Control

    def test_profile_idor_is_denied(self):
        auth = self.login()
        self.assertEqual(self.request("GET", "/profile?id=2", headers=auth)[0], 403)

    def test_orders_requires_session_and_hides_others(self):
        self.assertEqual(self.request("GET", "/orders")[0], 401)
        status, orders = self.request("GET", "/orders", headers=self.login())
        self.assertEqual(status, 200)
        self.assertTrue(orders)
        self.assertTrue(all(order["owner"] == 1 for order in orders))

    def test_files_cannot_read_other_user_receipt(self):
        auth = self.login()
        self.assertEqual(self.request("GET", "/files?user=bob&path=receipt.txt", headers=auth)[0], 403)

    def test_files_cannot_read_private_operator_note(self):
        for auth in (self.login(), self.login("staff", "learn-staff")):
            with self.subTest(role=auth):
                self.assertEqual(
                    self.request(
                        "GET",
                        "/files?user=alice&path=../../private/operator-note.txt",
                        headers=auth,
                    )[0],
                    403,
                )

    def test_debug_logs_requires_staff_and_redacts_secrets(self):
        self.assertEqual(self.request("GET", "/debug/logs")[0], 403)
        self.login()
        staff = self.login("staff", "learn-staff")
        status, logs = self.request("GET", "/debug/logs", headers=staff)
        self.assertEqual(status, 200)
        payload = json.dumps(logs)
        self.assertNotIn("learn-alice", payload)
        self.assertNotIn("learn-staff", payload)

    def test_internal_error_details_are_not_exposed(self):
        auth = self.login()
        status, result = self.request("GET", "/profile?id=notanumber", headers=auth)
        self.assertEqual(status, 400)
        payload = json.dumps(result).lower()
        self.assertNotIn("sqlite", payload)
        self.assertNotIn("operationalerror", payload)

    # Assistant tool authorization

    def test_assistant_execute_requires_session(self):
        self.assertEqual(
            self.request(
                "POST",
                "/assistant/execute",
                {"decision": {"tool": "export_profiles", "arguments": {}}},
            )[0],
            401,
        )

    def test_customer_cannot_export_profiles_through_assistant(self):
        self.assertEqual(
            self.request(
                "POST",
                "/assistant/execute",
                {"decision": {"tool": "export_profiles", "arguments": {}}},
                self.login(),
            )[0],
            403,
        )

    def test_customer_cannot_read_foreign_file_through_assistant(self):
        self.assertEqual(
            self.request(
                "POST",
                "/assistant/execute",
                {"decision": {"tool": "read_file", "arguments": {"path": "files/bob/receipt.txt"}}},
                self.login(),
            )[0],
            403,
        )

    def test_delete_tree_requires_staff_and_rejects_root(self):
        decision = {"decision": {"tool": "delete_tree", "arguments": {"path": "."}}}
        self.assertEqual(self.request("POST", "/assistant/execute", decision)[0], 401)
        self.assertEqual(self.request("POST", "/assistant/execute", decision, self.login())[0], 403)
        staff = self.login("staff", "learn-staff")
        self.assertEqual(self.request("POST", "/assistant/execute", decision, staff)[0], 400)

    # Repudiation

    def test_reviews_require_session(self):
        self.assertEqual(
            self.request("POST", "/reviews", {"product": "chair", "text": "anonymous"})[0], 401
        )


if __name__ == "__main__":
    unittest.main()
