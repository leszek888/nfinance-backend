from nbudget import app, db, Balance

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
        response = self.app.get('/balance/new')

        self.assertEqual(1, len(Balance.query.all()))
        self.assertEqual(str, type(response.json['balance_id']))
        self.assertEqual(200, response.status_code)

    def test_create_unique_balance_each_time(self):
        first_balance = self.app.get('/balance/new')
        second_balance = self.app.get('/balance/new')

        self.assertEqual(2, len(Balance.query.all()))
        self.assertNotEqual(first_balance.json['balance_id'], second_balance.json['balance_id'])

    def test_retrieve_balance_using_its_id(self):
        first_balance = self.app.get('/balance/new')
        second_balance = self.app.get('/balance/new')
        retrived_balance = self.app.get('/balance/'+first_balance.json['balance_id'])

        self.assertEqual(2, len(Balance.query.all()))
        self.assertEqual(first_balance.json['balance_id'], retrived_balance.json['balance_id'])

    def test_return_error_message_if_balance_format_is_wrong(self):
        response = self.app.get('/balance/wrong-format')

        self.assertEqual(0, len(Balance.query.all()))
        self.assertTrue('error' in response.json)

