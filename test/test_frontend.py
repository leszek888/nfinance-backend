from nbudget import app, db, Balance, Transactions, Entry

import datetime
import json
import os
import unittest

class FrontendTest(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////media/fast_wh/Projects/flask/nbudget/test-nbudget.db'
        db.create_all()
        self.balance = self.app.get('/api/balance/new')

    def tearDown(self):
        db.drop_all()
