from nbudget import app, db, Balance, Entry

import datetime
import json
import os
import unittest

class AccountsTest(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////media/fast_wh/Projects/flask/nbudget/test-nbudget.db'
        db.create_all()
        self.balance = self.app.get('/balance/new')

    def tearDown(self):
        db.drop_all()

    def create_transaction_json(self, balance_id = None,
                                payee = 'Payee',
                                date = datetime.date(2020, 1, 1),
                                entries = None,
                                transaction_id = None):
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

        if transaction_id is not None:
            transaction['id'] = transaction_id

        return json.dumps(transaction)

    def test_fetch_accounts_with_balances(self):
        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Assets',
                                                     'amount': '10'},
                                                    {'account': 'Income:Tax Return',
                                                     'amount': '-6'},
                                                    {'account': 'Income:Revenue',
                                                     'amount': '-4'},
                                                    ])
        self.app.post('/transaction/save', headers={"Content-Type":"application/json"},
                      data=transaction)
        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Assets',
                                                     'amount': '-100'},
                                                    {'account': 'Expenses:Housing',
                                                     'amount': '60'},
                                                    {'account': 'Expenses:Groceries',
                                                     'amount': '40'},
                                                    ])


        self.app.post('/transaction/save', headers={"Content-Type":"application/json"},
                      data=transaction)

        self.assertEqual(6, len(Entry.query.all()))

        response = self.app.post('/accounts', headers={"Content-Type":"application/json"},
                      data=json.dumps({'balance_id':self.balance.json['balance_id']}))

        self.assertEqual(200, response.status_code)
        self.assertTrue('accounts' in response.json)
        self.assertEqual(5, len(response.json['accounts']))
