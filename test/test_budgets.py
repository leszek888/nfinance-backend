from nbudget import app, db, Balance, Transaction, Entry

import json
import os
import unittest

class BalanceTest(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////media/fast_wh/Projects/flask/nbudget/test-nbudget.db'
        db.create_all()

    def tearDown(self):
        db.drop_all()

    def test_successful_balance_creation(self):
        response = self.app.get('/api/balance/new')

        self.assertEqual(1, len(Balance.query.all()))
        self.assertEqual(str, type(response.json['balance_id']))
        self.assertEqual(200, response.status_code)

    def test_create_unique_balance_each_time(self):
        first_balance = self.app.get('/api/balance/new')
        second_balance = self.app.get('/api/balance/new')

        self.assertEqual(2, len(Balance.query.all()))
        self.assertNotEqual(first_balance.json['balance_id'], second_balance.json['balance_id'])

    def test_create_balance_using_template(self):
        new_balance = self.app.get('/api/balance/new?template=demo')

        self.assertTrue(len(Transaction.query.filter(Transaction.balance_id == new_balance.json['balance_id']).all()) > 0)

    def test_balance_is_created_with_base_accounts(self):
        new_balance = self.app.get('/api/balance/new')

        self.assertEqual(5, len(Entry.query.all()))
