from decimal import *
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash

import datetime
import os
import uuid

load_dotenv()

app = Flask(__name__)
cors = CORS(app)

app.config['CORS_HEADERS'] = 'Content-Type'
app.config['SECRET_KEY'] = 'fjdkl93jf90834898gbcvhx98uft4389u0gdf'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////media/fast_wh/Projects/flask/nbudget/nbudget.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Balance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(50), unique=True)

class Transactions(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    payee = db.Column(db.String(100))
    date = db.Column(db.Date)
    balance_id = db.Column(db.Integer)

class Entry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer)
    account = db.Column(db.String(50))
    amount = db.Column(db.String)

@app.route('/balance/<balance_id>', methods=['GET'])
@cross_origin()
def get_balance(balance_id):
    if balance_id == 'new':
        new_balance = Balance(public_id=str(uuid.uuid4()))
        db.session.add(new_balance)
        db.session.commit()

        return jsonify({'balance_id' : new_balance.public_id})

    if len(balance_id) == 36:
        balance = Balance.query.filter_by(public_id=balance_id).first()

        if not balance:
            return jsonify({'message' : 'Balance not found.'})
        else:
            return jsonify({'balance_id' : balance.public_id})

    return jsonify({'message' : 'Balance not found.'})

@app.route('/transaction/new', methods=['POST'])
@cross_origin()
def create_transaction():
    data = request.get_json()

    # Validate Balance
    if 'balance_id' in data:
        balance = Balance.query.filter_by(public_id=data['balance_id']).first()
        if not balance:
            return jsonify({'message' : 'Balance not found. Transaction rejected.'})
    else:
        return jsonify({'message' : 'Balance not found. Transaction rejected.'})

    # Validate Payee
    if 'payee' in data:
        if len(data['payee']) == 0:
            return jsonify({'message' : 'Payee not specified. Transaction rejected.'})
    else:
        return jsonify({'message' : 'Payee not specified. Transaction rejected.'})

    # Validate Date
    if 'date' in data:
        date = data['date']
        date = date.split('-')

        if len(date) == 3:
            try:
                date = datetime.date(int(date[0]), int(date[1]), int(date[2]))
            except ValueError:
                return jsonify({'message' : 'Date in wrong format (req. YYYY-MM-DD). Transaction rejected.'})
        else:
            return jsonify({'message' : 'Date in wrong format (req. YYYY-MM-DD). Transaction rejected.'})
    else:
        return jsonify({'message' : 'Date in wrong format (req. YYYY-MM-DD). Transaction rejected.'})

    entries = None
    # Validate Entries
    if 'entries' in data:
        entries = data['entries']
        balance_amount = Decimal(0.0)

        for entry in entries:
            balance_amount += Decimal(entry.get('amount', 0.0))

            if len(entry.get('account', '')) == 0:
                return jsonify({'message' : 'Account not specified. Transaction rejected.'})

        if balance_amount != Decimal(0.0):
            return jsonify({'message' : 'Transaction not balanced. Transaction rejected.'})
    else:
        return jsonify({'message' : 'Entries not specified. Transaction rejected.'})


    # Submit Transaction
    transaction = Transactions(balance_id = data['balance_id'],
                              payee = data['payee'],
                              date = date)
    db.session.add(transaction)
    db.session.commit()

    if entries is not None:
        for entry in entries:
            new_entry = Entry(transaction_id = transaction.id,
                              account = entry['account'],
                              amount = entry['amount'])
            db.session.add(new_entry)
    db.session.commit()

    return jsonify({'message' : 'Transaction saved.'})

@app.route('/transaction/list/<balance_id>', methods=['GET'])
@cross_origin()
def get_transactions(balance_id):
    if len(balance_id) != 36:
        return jsonify({'message' : 'Wrong Balance Format.'})

    if not Balance.query.filter_by(public_id=balance_id).first():
        return jsonify({'message' : 'Balance not found.'})

    transactions = Transactions.query.filter_by(balance_id=balance_id).all()
    formatted_transactions = []

    for transaction in transactions:
        fetched_transaction = {}
        fetched_transaction['date'] = str(transaction.date)
        fetched_transaction['payee'] = transaction.payee
        entries = Entry.query.filter_by(transaction_id=transaction.id).all()
        fetched_entries = []
        for entry in entries:
            fetched_entries.append({
                'account' : entry.account,
                'amount' : entry.amount
            })
        fetched_transaction['entries'] = fetched_entries
        formatted_transactions.append(fetched_transaction)

    return jsonify({'transactions' : formatted_transactions})

@app.route('/')
def index():
    return "Index"

