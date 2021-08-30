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
        self.app.set_cookie(key='balance_id', value=self.balance.json['balance_id'], server_name=None)

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

    def test_fetch_empty_accounts_list_includes_five_base_accounts(self):
        response = self.app.get('/api/accounts')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(5, len(response.json['accounts']))

    def test_fetch_accounts_with_balances(self):
        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Assets',
                                                     'amount': '10'},
                                                    {'account': 'Income:Tax Return',
                                                     'amount': '-6'},
                                                    {'account': 'Income:Revenue',
                                                     'amount': '-4'},
                                                    ])
        self.app.post('/api/transaction', headers={"Content-Type":"application/json"},
                      data=transaction)
        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Assets',
                                                     'amount': '-100'},
                                                    {'account': 'Expenses:Housing',
                                                     'amount': '60'},
                                                    {'account': 'Expenses:Groceries',
                                                     'amount': '40'},
                                                    ])


        self.app.post('/api/transaction', headers={"Content-Type":"application/json"},
                      data=transaction)

        self.assertEqual(11, len(Entry.query.all()))

        response = self.app.get('/api/accounts')

        self.assertEqual(200, response.status_code)
        self.assertTrue('accounts' in response.json)
        self.assertEqual(9, len(response.json['accounts']))

    def test_fetched_accounts_are_sorted(self):
        response = self.app.get('/api/accounts')

        accounts = response.json['accounts']

        self.assertEqual('Assets', accounts[0]['name'])
        self.assertEqual('Equity', accounts[1]['name'])
        self.assertEqual('Expenses', accounts[2]['name'])
        self.assertEqual('Income', accounts[3]['name'])
        self.assertEqual('Liabilities', accounts[4]['name'])

    def test_fetched_accounts_are_filtered(self):
        transaction = self.create_transaction_json( date = '2020-01-01',
                                                    entries = [
                                                    {'account': 'Assets:Cash',
                                                     'amount': '10'},
                                                    {'account': 'Expenses:Groceries',
                                                     'amount': '-10'},
                                                    ])
        self.app.post('/api/transaction', headers={"Content-Type":"application/json"},
                      data=transaction)

        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Liabilities:Debt',
                                                     'amount': '-100'},
                                                    {'account': 'Income:Paycheck',
                                                     'amount': '60'},
                                                    {'account': 'Capital:Opening',
                                                     'amount': '40'},
                                                    ],
                                                   date = '2020-01-02',
                                                   )
        self.app.post('/api/transaction', headers={"Content-Type":"application/json"},
                      data=transaction)

        transaction = self.create_transaction_json(entries = [
                                                    {'account': 'Assets:Cash',
                                                     'amount': '25'},
                                                    {'account': 'Expenses:Hobbies',
                                                     'amount': '-5'},
                                                    {'account': 'Liabilities:Credit Card',
                                                     'amount': '-20'},
                                                    ],
                                                   date = '2020-01-03'
                                                   )
        self.app.post('/api/transaction', headers={"Content-Type":"application/json"},
                      data=transaction)


        response = self.app.get('/api/accounts?date_from=2020-01-02&date_to=2020-01-03&account=Assets&account=Liabilities')

        accounts = response.json['accounts']
        nonzero_accounts = []

        for account in accounts:
            if account['balance'] != '0.00':
                nonzero_accounts.append(account)

        self.assertEqual(len(nonzero_accounts), 3)
