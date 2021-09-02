from decimal import *
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, redirect
from flask_cors import CORS, cross_origin
from flask_sqlalchemy import SQLAlchemy
from functools import wraps

import datetime
import json
import os
import uuid
import jwt

load_dotenv()

app = Flask(__name__)
cors = CORS(app)

app.config['CORS_HEADERS'] = 'Content-Type'
app.config['SECRET_KEY'] = os.environ['NB_KEY']
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['NB_DB_URI']
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Balance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    payee = db.Column(db.String(100))
    date = db.Column(db.Date)
    balance_id = db.Column(db.String(36))
    entries = db.relationship("Entry", back_populates="transaction")

class Entry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    balance_id = db.Column(db.String(36))
    account = db.Column(db.String(255))
    amount = db.Column(db.String(32))
    transaction_id = db.Column(db.Integer, db.ForeignKey("transaction.id"))
    transaction = db.relationship("Transaction", back_populates="entries")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        balance_id = None

        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']
            try:
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
                balance_id = data['balance_id']
            except:
                balance_id = None
        else:
            balance_id = request.cookies.get('balance_id', None)

        if not validate_balance(balance_id):
            balance_id = None

        return f(balance_id, *args, **kwargs)
    return decorated

@app.route('/api/balance/new', methods=['GET'])
@cross_origin()
def create_balance():
    new_balance = Balance(public_id=str(uuid.uuid4()))
    db.session.add(new_balance)
    db.session.commit()

    create_base_accounts(new_balance.public_id)

    if request.args.get('template'):
        populate_balance(new_balance.public_id, request.args.get('template'))

    return jsonify({'balance_id' : new_balance.public_id})

@app.route('/api/transaction', methods=['POST'])
@cross_origin()
@token_required
def create_transaction(balance_id):
    data = request.get_json()

    if not balance_id:
        return api_error('Balance not found')

    data['balance_id'] = balance_id;

    return jsonify(save_transaction(data))

@app.route('/api/transaction', methods=['GET'])
@cross_origin()
@token_required
def get_transactions(balance_id):
    balance_id = None

    if balance_id:
        balance_id = balance_id
    elif request.cookies.get('balance_id'):
        balance_id = request.cookies.get('balance_id')

    if not balance_id or len(balance_id) != 36:
        return jsonify({'error' : 'Balance not found.'})

    if not Balance.query.filter_by(public_id=balance_id).first():
        return jsonify({'error' : 'Balance not found.'})

    transactions = Transaction.query.filter_by(balance_id=balance_id).order_by(Transaction.date.desc()).order_by(Transaction.id.desc());

    if request.args.get('date_from') is not None:
        transactions = transactions.filter(Transaction.date >= request.args.get('date_from'))

    if request.args.get('date_to') is not None:
        transactions = transactions.filter(Transaction.date <= request.args.get('date_to'))

    if request.args.get('payee') is not None:
        transactions = transactions.filter(Transaction.payee.like('%'+request.args.get('payee')+'%'))

    formatted_transactions = []

    for transaction in transactions:
        if request.args.get('account'):
            if len(Entry.query.filter(Entry.transaction_id == transaction.id,
                                      Entry.account.like('%'+request.args.get('account')+'%')).all()) == 0:
                continue

        fetched_transaction = {}
        fetched_transaction['id'] = transaction.id
        fetched_transaction['date'] = str(transaction.date)
        fetched_transaction['payee'] = transaction.payee
        entries = Entry.query.filter_by(transaction_id=transaction.id).order_by(Entry.account).all()
        fetched_entries = []
        for entry in entries:
            fetched_entries.append({
                'account' : entry.account,
                'amount' : str(entry.amount)
            })
        fetched_transaction['entries'] = fetched_entries
        formatted_transactions.append(fetched_transaction)

    response = jsonify({'transactions' : formatted_transactions})
    return response

@app.route('/api/transaction', methods=['DELETE'])
@token_required
@cross_origin()
def delete_transaction(balance_id):
    data = request.get_json()
    balance = None

    if balance_id:
        balance = Balance.query.filter_by(public_id=balance_id).first()
    elif 'balance_id' in data:
        balance = Balance.query.filter_by(public_id=data['balance_id']).first()

    if not balance:
        return {'error' : 'Balance not found.'}

    if 'id' in data:
        transaction = Transaction.query.filter_by(id=data['id']).first()
        if not transaction:
            return {'error' : 'Transaction not found.'}
        else:
            entries = Entry.query.filter_by(transaction_id=data['id'])
            for entry in entries:
                db.session.delete(entry)

            db.session.delete(transaction)
            db.session.commit()
            return jsonify({'message' : 'Transaction deleted.'})
    return jsonify({'error' : 'Query not understood.'})

def validate_balance(balance_id):
    if not balance_id:
        return False

    balance = Balance.query.filter_by(public_id=balance_id).first()
    if not balance:
        return False
    return True

def validate_payee(payee):
    if len(payee) == 0:
        return False
    return True

def format_date(date):
    if not date:
        return False

    date = date.split('-')

    if len(date) == 3:
        try:
            date = datetime.date(int(date[0]), int(date[1]), int(date[2]))
            return date
        except ValueError:
            return False
    else:
        return False

    return True

def validate_accounts(accounts):
    for sub_account in accounts:
        if len(str(sub_account).strip(' ')) == 0:
            return False
    return True

def save_transaction(transaction):
    if not validate_balance(transaction.get('balance_id', None)):
        return {'error' : 'Balance not found. Transaction rejected.'}

    # Validate Payee
    transaction['payee'] = str(transaction['payee']).strip(' ')
    if not validate_payee(transaction.get('payee', None)):
        return {'error' : 'Payee not specified. Transaction rejected.'}

    # Validate Date
    date = format_date(transaction.get('date', None))
    if not date:
        return {'error' : 'Date in wrong format, accepted format: YYYY-MM-DD'}

    entries = None
    valid_entries = 0
    missing_amount = None

    # Validate Entries
    if 'entries' in transaction:
        entries = transaction['entries']
        balance_amount = Decimal(0.0)

        for entry in entries:
            # Skip empty entries
            if 'account' not in entry or 'amount' not in entry:
                continue

            entry['account'] = str(entry['account']).strip(' ')
            entry['amount'] = str(entry['amount']).strip(' ')

            if len(entry['account']) == 0 and len(entry['amount']) == 0:
                continue

            sub_accounts = entry['account'].split(':')

            if not validate_accounts(sub_accounts):
                return {'error' : 'Couldnt read the account. Transaction rejected.'}

            entry_amount = None
            entry['amount'] = str(entry.get('amount', 0.0)).replace(',', '.')

            if len(entry['amount']) == 0:
                if missing_amount == None:
                    missing_amount = entry
                    valid_entries += 1
                    continue
                else:
                    return {'error' : 'Couldnt read the amount. Transaction rejected.'}

            try:
                entry_amount = Decimal(entry['amount'])
            except InvalidOperation:
                return {'error' : 'Couldnt read the amount. Transaction rejected.'}

            balance_amount += entry_amount
            valid_entries += 1

        if missing_amount:
            missing_amount['amount'] = balance_amount * -1
            balance_amount += missing_amount['amount']

        if balance_amount != Decimal(0.0):
            return {'error' : 'Transaction not balanced. Transaction rejected.'}
    else:
        return {'error' : 'Entries not specified. Transaction rejected.'}

    if valid_entries < 2:
        return {'error' : 'At least 2 entries have to be specified. Transaction rejected.'}

    new_entries = []
    if entries is not None:
        for entry in entries:
            if len(entry['account']) == 0 and len(entry['amount']) == 0:
                continue

            new_entries.append(
                            Entry(
                              balance_id = transaction['balance_id'],
                              account = entry['account'],
                              amount = str(entry['amount'])
                            ))

    # Submit Transaction
    submitted_transaction = None
    if 'id' in transaction:
        submitted_transaction = Transaction.query.filter_by(id=transaction['id']).first()
        if submitted_transaction:
            submitted_transaction.payee = transaction['payee']
            submitted_transaction.date = date
        old_entries = Entry.query.filter_by(transaction_id=transaction['id']).all()
        for old_entry in old_entries:
            db.session.delete(old_entry)
    else:
        submitted_transaction = Transaction(balance_id = transaction['balance_id'],
                              payee = transaction['payee'],
                              date = date)

    submitted_transaction.entries.extend(new_entries)

    db.session.add(submitted_transaction)
    db.session.add_all(new_entries)
    db.session.commit()

    return {'message' : 'Transaction saved.'}

@app.route('/api/accounts', methods=['GET'])
@cross_origin()
@token_required
def get_accounts(balance_id):
    filters = request.args
    filter_accounts = request.args.getlist('account')
    balance_id = None

    if balance_id:
        balance_id = balance_id
    elif request.cookies.get('balance_id'):
        balance_id = request.cookies.get('balance_id')

    else:
        return jsonify({'error': 'No balance specified.'})

    transactions = Transaction.query.filter(Transaction.balance_id == balance_id)
    entries = Entry.query.filter(Entry.balance_id == balance_id).order_by(Entry.account)

    accounts = []
    for entry in entries.all():
        account_found = False
        for account in accounts:
            if account['name'] == entry.account:
                account_found = True
        if not account_found:
            accounts.append({'name':entry.account,
                             'balance':Decimal(0)})

    if 'date_from' in filters:
        transactions = transactions.filter(Transaction.date >= filters['date_from'])
    if 'date_to' in filters:
        transactions = transactions.filter(Transaction.date <= filters['date_to'])

    if 'date_from' in filters or 'date_to' in filters:
        entries = entries.filter(Entry.transaction_id.in_(
            [t.id for t in transactions.all()]))

    filtered_entries = []
    if 'account' in filters:
        for account in request.args.getlist('account'):
            filtered_entries += entries.filter(Entry.account.like('%'+account+'%')).all()
    else:
        filtered_entries = entries.all()

    for entry in filtered_entries:
        for account in accounts:
            if account['name'] == entry.account:
                account['balance'] += Decimal(entry.amount)

    for account in accounts:
        account['balance'] = str(account['balance'])

    return {'accounts' : accounts}

@app.route('/api/auth')
def authorize():
    auth = request.authorization

    if not auth or not auth.username or not auth.password:
        return jsonify({'error': 'Authorization failed.'})

    balance = Balance.query.filter_by(public_id=auth.username).first()

    if not balance:
        return jsonify({'error': 'Authorization failed.'})

    token = jwt.encode({'balance_id':balance.public_id}, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({'token': token})

if __name__ == "__main__":
    app.run(ssl_context='adhoc')

def populate_balance(balance_id, template):
    print('populating...')
    try:
        print('opening: '+template+'.json')
        with open(template+'.json', 'r') as demo:
            data = demo.read()

        transactions = json.loads(data)
    except:
        print("Loading template failed")

    for transaction in transactions:
        transaction['balance_id'] = balance_id
        save_transaction(transaction)

def create_base_accounts(balance_id):
    base_accounts = [ 'Assets', 'Liabilities', 'Equity', 'Income', 'Expenses' ]

    for account in base_accounts:
        new_account = Entry(balance_id=balance_id, account=account, amount='0')
        db.session.add(new_account)
    db.session.commit()
