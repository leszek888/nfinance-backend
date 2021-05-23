from nbudget import app, db, Balance, Transactions, Entry

import datetime
import json
import os
import unittest

class TransactionsTest(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////media/fast_wh/Projects/flask/nbudget/test-nbudget.db'
        db.create_all()
        self.balance = self.app.get('/balance/new')

    def tearDown(self):
        db.drop_all()

    def create_entry(self, account, amount):
        return { 'account' : account, 'amount': amount }

    def create_transaction_json(self, balance_id = None,
                                payee = 'Payee',
                                date = datetime.date(2020, 1, 1),
                                entries = None):
        if balance_id is None:
            balance_id = self.balance.json['balance_id']

        if entries is None:
            entries = [
                self.create_entry('Debit', 5.0),
                self.create_entry('Credit', -5.0)
            ]

        transaction = {
            'balance_id' : balance_id,
            'payee' : payee,
            'date' : str(date),
            'entries' : entries
        }
        return json.dumps(transaction)

    def test_validate_valid_transaction(self):
        transaction = self.create_transaction_json()

        response = self.app.post('/transaction/new',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertEqual(1, len(Transactions.query.all()))
        self.assertEqual(2, len(Entry.query.all()))
        self.assertEqual(Entry.query.first().transaction_id, Transactions.query.first().id)

    def test_reject_transaction_with_wrong_balance_id(self):
        transaction = self.create_transaction_json(balance_id = "wrong-id")

        response = self.app.post('/transaction/new',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('message' in response.json)

    def test_reject_transaction_without_payee(self):
        transaction = self.create_transaction_json(payee = '')

        response = self.app.post('/transaction/new',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('message' in response.json)


    def test_reject_transaction_with_wrong_date(self):
        transaction = self.create_transaction_json(date = 'wrong')

        response = self.app.post('/transaction/new',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('message' in response.json)


    def test_reject_unbalanced_transaction(self):
        transaction = self.create_transaction_json(entries = [
                                                        {'account' : 'Debit',
                                                         'amount' : '5' },
                                                        {'account' : 'Credit',
                                                         'amount' : '5' }
                                                   ])

        response = self.app.post('/transaction/new',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('message' in response.json)

    def test_list_all_transaction(self):
        for i in range(0, 5):
            transaction = self.create_transaction_json()
            response = self.app.post('/transaction/new',
                                     headers={"Content-Type":"application/json"},
                                     data=transaction)

        self.assertEqual(10, len(Entry.query.all()))
        response = self.app.get('/transaction/list/'+self.balance.json['balance_id'])
        self.assertEqual(200, response.status_code)
        if 'message' in response.json:
            print(response.json['message'])
        self.assertFalse('message' in response.json)
        self.assertEqual(5, len(response.json['transactions']))
