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
        self.balance = self.app.get('/api/balance/new')

    def tearDown(self):
        db.drop_all()

    def get_transactions(self):
        self.app.set_cookie(key='balance_id', value=self.balance.json['balance_id'], server_name=None)

        return self.app.get('/api/transaction')


    def save_transaction(self, transaction):
        return self.app.post('/api/transaction',
                        headers={"Content-Type":"application/json"},
                        data=transaction)

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

        response = self.app.post('/api/transaction',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction)

        self.assertEqual(200, response.status_code)
        self.assertEqual(1, len(Transactions.query.all()))
        self.assertEqual(2, len(Entry.query.all()))
        self.assertEqual(Entry.query.first().transaction_id, Transactions.query.first().id)

    def test_reject_transaction_with_wrong_balance_id(self):
        transaction = self.create_transaction_json(balance_id = "wrong-id")

        response = self.save_transaction(transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('error' in response.json)

    def test_reject_transaction_without_payee(self):
        transaction = self.create_transaction_json(payee = '')

        response = self.save_transaction(transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('error' in response.json)

    def test_reject_transaction_with_wrong_date(self):
        transaction = self.create_transaction_json(date = 'wrong')

        response = self.save_transaction(transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('error' in response.json)

    def test_reject_transaction_with_wrong_amounts(self):
        transaction = self.create_transaction_json(entries = [
                                                        {'account' : 'Debit',
                                                         'amount' : 'e' },
                                                        {'account' : 'Credit',
                                                         'amount' : '-e' }
                                                   ])

        response = self.save_transaction(transaction)

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

        response = self.save_transaction(transaction)

        self.assertEqual(200, response.status_code)
        self.assertFalse('error' in response.json)
        self.assertEqual(1, len(Transactions.query.all()))
        self.assertEqual(2, len(Entry.query.all()))

    def test_dont_save_transaction_with_empty_entries(self):
        transaction = self.create_transaction_json(entries = [
                                                        {'account' : '',
                                                         'amount' : '' },
                                                        {'account' : '',
                                                         'amount' : '' },
                                                   ])

        response = self.save_transaction(transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('error' in response.json)
        self.assertEqual(0, len(Transactions.query.all()))
        self.assertEqual(0, len(Entry.query.all()))

    def test_allow_amounts_with_both_commas_and_dots(self):
        transaction = self.create_transaction_json(entries = [
                                                        {'account' : 'Debit',
                                                         'amount' : '32.25' },
                                                        {'account' : 'Credit',
                                                         'amount' : '-32,25' }
                                                   ])

        response = self.save_transaction(transaction)

        self.assertEqual(200, response.status_code)
        self.assertFalse('error' in response.json)

    def test_allow_transaction_with_one_missing_amount_and_calc_the_balance_out(self):
        transaction = self.create_transaction_json(entries = [
                                                        {'account' : 'Debit',
                                                         'amount' : '32.25' },
                                                        {'account' : 'Credit',
                                                         'amount' : '' }
                                                   ])

        response = self.save_transaction(transaction)
        balanced_entry = Entry.query.filter_by(account='Credit').first()

        self.assertEqual(200, response.status_code)
        self.assertFalse('error' in response.json)
        self.assertEqual(-32.25, balanced_entry.amount)


    def test_reject_unbalanced_transaction(self):
        transaction = self.create_transaction_json(entries = [
                                                        {'account' : 'Debit',
                                                         'amount' : '5' },
                                                        {'account' : 'Credit',
                                                         'amount' : '5' }
                                                   ])

        response = self.save_transaction(transaction)

        self.assertEqual(200, response.status_code)
        self.assertTrue('error' in response.json)

    def test_update_existing_transactions(self):
        transaction = self.create_transaction_json()

        response = self.save_transaction(transaction)

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

        new_response = self.save_transaction(changed_transaction)

        transaction = Transactions.query.filter_by(id=transaction_id).first()
        entries = Entry.query.filter_by(transaction_id=transaction_id).all()

        self.assertEqual(200, new_response.status_code)
        self.assertEqual(1, len(Transactions.query.all()))
        self.assertEqual(transaction.payee, "EDITED PAYEE")
        self.assertEqual(str(transaction.date), "2020-12-31")
        self.assertEqual(3, len(entries))

    def test_delete_transaction(self):
        transaction = self.create_transaction_json()

        response = self.save_transaction(transaction)
        response = self.save_transaction(transaction)

        self.assertEqual(2, len(Transactions.query.all()))
        self.assertEqual(4, len(Entry.query.all()))

        transaction_to_delete = json.dumps({ 'id' : Transactions.query.first().id,
                                  'balance_id' : Transactions.query.first().balance_id })

        response = self.app.delete('/api/transaction',
                                 headers={"Content-Type":"application/json"},
                                 data=transaction_to_delete)

        self.assertEqual(200, response.status_code)
        self.assertFalse('error' in response.json)
        self.assertEqual(1, len(Transactions.query.all()))
        self.assertEqual(2, len(Entry.query.all()))

    def test_list_all_transaction(self):
        for i in range(0, 5):
            transaction = self.create_transaction_json()
            response = self.save_transaction(transaction)

        self.assertEqual(10, len(Entry.query.all()))

        response = self.get_transactions()

        self.assertEqual(200, response.status_code)

        if 'error' in response.json:
            print(response.json['error'])

        self.assertFalse('error' in response.json)
        self.assertEqual(5, len(response.json['transactions']))

    def test_filter_params_are_decoded_before_use(self):
        transaction = self.create_transaction_json(date='2020-01-01', payee='Jay&Jay: Company')
        response = self.save_transaction(transaction)
        self.app.set_cookie(key='balance_id', value=self.balance.json['balance_id'], server_name=None)
        response = self.app.get('/api/transaction?payee=Jay%26Jay%3A%20Company')
        self.assertEqual(len(response.json['transactions']), 1)

    def test_filter_transactions(self):
        transaction = self.create_transaction_json(date='2020-01-01', payee='First')

        response = self.save_transaction(transaction)

        transaction = self.create_transaction_json(date='2020-01-02', payee='Second', entries=[
                            {'account':'Income', 'amount':'32'}, {'account':'Equity', 'amount':'-32'}
                                    ])
        response = self.save_transaction(transaction)

        transaction = self.create_transaction_json(date='2020-01-03', payee='First:Sub')
        response = self.save_transaction(transaction)

        transaction = self.create_transaction_json(date='2020-01-04', payee='Sub:First')
        response = self.save_transaction(transaction)

        self.app.set_cookie(key='balance_id', value=self.balance.json['balance_id'], server_name=None)

        response = self.app.get('/api/transaction?date_from=2020-01-03&date_to=2020-01-04')
        self.assertEqual(len(response.json['transactions']), 2)

        response = self.app.get('/api/transaction?payee=first')
        self.assertEqual(len(response.json['transactions']), 3)

        response = self.app.get('/api/transaction?account=debit')
        self.assertEqual(len(response.json['transactions']), 3)

    def test_entries_are_sorted(self):
        transaction = self.create_transaction_json(entries = [
            self.create_entry('Equity', '10'),
            self.create_entry('Assets', '-5'),
            self.create_entry('Income', '-5')
        ])

        self.save_transaction(transaction)
        response = self.get_transactions()

        self.assertEqual(response.json['transactions'][0]['entries'][0]['account'], 'Assets')
        self.assertEqual(response.json['transactions'][0]['entries'][1]['account'], 'Equity')
        self.assertEqual(response.json['transactions'][0]['entries'][2]['account'], 'Income')
