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
        self.balance = self.app.get('/api/balance/new')

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
        self.app.post('/api/transaction/save', headers={"Content-Type":"application/json"},
                      data=transaction)
        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Assets',
                                                     'amount': '-100'},
                                                    {'account': 'Expenses:Housing',
                                                     'amount': '60'},
                                                    {'account': 'Expenses:Groceries',
                                                     'amount': '40'},
                                                    ])


        self.app.post('/api/transaction/save', headers={"Content-Type":"application/json"},
                      data=transaction)

        self.assertEqual(6, len(Entry.query.all()))

        response = self.app.post('/api/accounts', headers={"Content-Type":"application/json"},
                      data=json.dumps({'balance_id':self.balance.json['balance_id']}))

        self.assertEqual(200, response.status_code)
        self.assertTrue('accounts' in response.json)
        self.assertEqual(5, len(response.json['accounts']))

    def test_fetched_accounts_are_sorted(self):
        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Assets',
                                                     'amount': '10'},
                                                    {'account': 'Expenses',
                                                     'amount': '-10'},
                                                    ])
        self.app.post('/api/transaction/save', headers={"Content-Type":"application/json"},
                      data=transaction)

        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Liabilities',
                                                     'amount': '-100'},
                                                    {'account': 'Income',
                                                     'amount': '60'},
                                                    {'account': 'Capital',
                                                     'amount': '40'},
                                                    ])
        self.app.post('/api/transaction/save', headers={"Content-Type":"application/json"},
                      data=transaction)

        response = self.app.post('/api/accounts', headers={"Content-Type":"application/json"},
                      data=json.dumps({'balance_id':self.balance.json['balance_id']}))

        accounts = response.json['accounts']

        self.assertEqual('Assets', accounts[0]['name'])
        self.assertEqual('Capital', accounts[1]['name'])
        self.assertEqual('Expenses', accounts[2]['name'])
        self.assertEqual('Income', accounts[3]['name'])
        self.assertEqual('Liabilities', accounts[4]['name'])

    def test_fetched_accounts_are_filtered(self):
        transaction = self.create_transaction_json( date = '2020-01-01',
                                                    entries = [
                                                    {'account': 'Assets',
                                                     'amount': '10'},
                                                    {'account': 'Expenses',
                                                     'amount': '-10'},
                                                    ])
        self.app.post('/api/transaction/save', headers={"Content-Type":"application/json"},
                      data=transaction)

        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Liabilities',
                                                     'amount': '-100'},
                                                    {'account': 'Income',
                                                     'amount': '60'},
                                                    {'account': 'Capital',
                                                     'amount': '40'},
                                                    ],
                                                   date = '2020-01-02',
                                                   )
        self.app.post('/api/transaction/save', headers={"Content-Type":"application/json"},
                      data=transaction)

        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Assets',
                                                     'amount': '25'},
                                                    {'account': 'Expenses',
                                                     'amount': '-5'},
                                                    {'account': 'Liabilities',
                                                     'amount': '-20'},
                                                    ],
                                                   date = '2020-01-03'
                                                   )
        self.app.post('/api/transaction/save', headers={"Content-Type":"application/json"},
                      data=transaction)


        response = self.app.post('/api/accounts/filtered', headers={"Content-Type":"application/json"},
                      data=json.dumps({'balance_id':self.balance.json['balance_id'],
                                       'filters': {
                                            'date': { 'from': '2020-01-02','to':'2020-01-03' },
                                            'account': [ 'Assets', 'Liabilities' ],
                                       }
                                       }))

        accounts = response.json['accounts']

        self.assertEqual(len(accounts), 2)
        self.assertEqual('Assets', accounts[0]['name'])
        self.assertEqual('Liabilities', accounts[1]['name'])
        self.assertEqual('25.00', accounts[0]['balance'])
        self.assertEqual('-120.00', accounts[1]['balance'])

