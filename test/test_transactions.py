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

    def test_validate_valid_transaction(self):
        transaction = self.create_transaction_json()

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertEqual(1, len(Transactions.query.all()))
        self.assertEqual(2, len(Entry.query.all()))
        self.assertEqual(Entry.query.first().transaction_id, Transactions.query.first().id)

    def test_reject_transaction_with_wrong_balance_id(self):
        transaction = self.create_transaction_json(balance_id = "wrong-id")

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('error' in response.json)

    def test_reject_transaction_without_payee(self):
        transaction = self.create_transaction_json(payee = '')

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('error' in response.json)

    def test_reject_transaction_with_wrong_date(self):
        transaction = self.create_transaction_json(date = 'wrong')

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('error' in response.json)

    def test_reject_transaction_with_wrong_amounts(self):
        transaction = self.create_transaction_json(entries = [
                                                        {'account' : 'Debit',
                                                         'amount' : 'e' },
                                                        {'account' : 'Credit',
                                                         'amount' : '-e' }
                                                   ])

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('error' in response.json)

    def test_ignore_empty_entries_when_validating_transaction(self):
        transaction = self.create_transaction_json(entries = [
                                                        {'account' : 'Debit',
                                                         'amount' : '5' },
                                                        {'account' : 'Credit',
                                                         'amount' : '-5' },
                                                        {'account' : '',
                                                         'amount' : ''},
                                                   ])

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertFalse('error' in response.json)
        self.assertEqual(1, len(Transactions.query.all()))
        self.assertEqual(2, len(Entry.query.all()))

    def test_allow_amounts_with_both_commas_and_dots(self):
        transaction = self.create_transaction_json(entries = [
                                                        {'account' : 'Debit',
                                                         'amount' : '32.25' },
                                                        {'account' : 'Credit',
                                                         'amount' : '-32,25' }
                                                   ])

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertFalse('error' in response.json)

    def test_reject_unbalanced_transaction(self):
        transaction = self.create_transaction_json(entries = [
                                                        {'account' : 'Debit',
                                                         'amount' : '5' },
                                                        {'account' : 'Credit',
                                                         'amount' : '5' }
                                                   ])

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('error' in response.json)

    def test_update_existing_transactions(self):
        transaction = self.create_transaction_json()

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        transaction_id = Transactions.query.first().id;
        changed_transaction = self.create_transaction_json( payee = "EDITED PAYEE",
                                                            date = "2020-12-31",
                                                            entries = [
                                                                {'account' : 'EDITED Debit',
                                                                 'amount': '100' },
                                                                {'account' : 'EDITED Credit',
                                                                 'amount': '-60' },
                                                                {'account' : 'EDITED Second',
                                                                 'amount': '-40' }
                                                            ],
                                                            transaction_id = transaction_id
                                                           )

        new_response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=changed_transaction)

        transaction = Transactions.query.filter_by(id=transaction_id).first()
        entries = Entry.query.filter_by(transaction_id=transaction_id).all()

        self.assertEqual(200, new_response.status_code)
        self.assertEqual(1, len(Transactions.query.all()))
        self.assertEqual(transaction.payee, "EDITED PAYEE")
        self.assertEqual(str(transaction.date), "2020-12-31")
        self.assertEqual(3, len(entries))

    def test_delete_transaction(self):
        transaction = self.create_transaction_json()

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        response = self.app.post('/transaction/save',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(2, len(Transactions.query.all()))
        self.assertEqual(4, len(Entry.query.all()))

        transaction_to_delete = json.dumps({ 'id' : Transactions.query.first().id,
                                  'balance_id' : Transactions.query.first().balance_id })

        response = self.app.delete('/transaction/delete',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction_to_delete)

        self.assertEqual(200, response.status_code)
        self.assertFalse('error' in response.json)
        self.assertEqual(1, len(Transactions.query.all()))
        self.assertEqual(2, len(Entry.query.all()))

    def test_list_all_transaction(self):
        for i in range(0, 5):
            transaction = self.create_transaction_json()
            response = self.app.post('/transaction/save',
                                     headers={"Content-Type":"application/json"},
                                     data=transaction)

        self.assertEqual(10, len(Entry.query.all()))
        response = self.app.get('/transaction/list/'+self.balance.json['balance_id'])
        self.assertEqual(200, response.status_code)
        if 'error' in response.json:
            print(response.json['error'])
        self.assertFalse('error' in response.json)
        self.assertEqual(5, len(response.json['transactions']))
