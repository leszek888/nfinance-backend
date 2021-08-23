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
    public_id = db.Column(db.String(50), unique=True)

class Transactions(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    payee = db.Column(db.String(100))
    date = db.Column(db.Date)
    balance_id = db.Column(db.Integer)

class Entry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer)
    balance_id = db.Column(db.Integer)
    account = db.Column(db.String(255))
    amount = db.Column(db.Numeric)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']
            print('Accessing with token: ', token)

        if not token:
            current_balance = None

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_balance = Balance.query.filter_by(public_id=data['balance_id']).first().public_id;
        except:
            print('invalid token')
            current_balance = None

        if not current_balance:
            print('Invalid Token')

        return f(current_balance, *args, **kwargs)
    return decorated

def get_formatted_decimal(num):
    dec = str(num).split('.')
    formatted_number = None

    if len(dec) > 1:
        dec[1] = dec[1].rstrip('0')
        formatted_number = dec[0] + '.' + dec[1]

        if len(dec[1]) == 0:
            formatted_number += '00'
        if len(dec[1]) == 1:
            formatted_number += '0'
    else:
        formatted_number = dec[0] + '.00'

    return formatted_number

@app.route('/api/balance/new', methods=['GET'])
@cross_origin()
def create_balance():
    new_balance = Balance(public_id=str(uuid.uuid4()))
    db.session.add(new_balance)
    db.session.commit()

    if request.args.get('template'):
        populate_balance(new_balance.public_id)

    return jsonify({'balance_id' : new_balance.public_id})

@app.route('/api/transaction', methods=['POST'])
@cross_origin()
@token_required
def create_transaction(current_balance):
    data = request.get_json()
    if current_balance:
        data['balance_id'] = current_balance;
    print(request.get_data())

    return jsonify(save_transaction(data))

@app.route('/api/transaction', methods=['GET'])
@cross_origin()
@token_required
def get_transactions(current_balance):
    balance_id = None

    if current_balance:
        balance_id = current_balance
    elif request.cookies.get('balance_id'):
        balance_id = request.cookies.get('balance_id')

    if not balance_id or len(balance_id) != 36:
        return jsonify({'error' : 'Balance not found.'})

    if not Balance.query.filter_by(public_id=balance_id).first():
        return jsonify({'error' : 'Balance not found.'})

    transactions = Transactions.query.filter_by(balance_id=balance_id).order_by(Transactions.date.desc()).order_by(Transactions.id.desc());

    if request.args.get('date_from') is not None:
        print('filtering date')
        transactions = transactions.filter(Transactions.date >= request.args.get('date_from'))

    if request.args.get('date_to') is not None:
        transactions = transactions.filter(Transactions.date <= request.args.get('date_to'))

    if request.args.get('payee') is not None:
        transactions = transactions.filter(Transactions.payee.like('%'+request.args.get('payee')+'%'))

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
                'amount' : get_formatted_decimal(entry.amount)
            })
        fetched_transaction['entries'] = fetched_entries
        formatted_transactions.append(fetched_transaction)

    response = jsonify({'transactions' : formatted_transactions})
    return response

@app.route('/api/transaction', methods=['DELETE'])
@token_required
@cross_origin()
def delete_transaction(current_balance):
    data = request.get_json()

    if current_balance:
        balance = Balance.query.filter_by(public_id=current_balance).first()
    elif 'balance_id' in data:
        balance = Balance.query.filter_by(public_id=data['balance_id']).first()
        if not balance:
            return {'error' : 'Balance not found.'}

    if 'id' in data:
        transaction = Transactions.query.filter_by(id=data['id']).first()
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

@app.route('/')
@app.route('/transactions')
@app.route('/balance')
def index():
    if 'balance_id' not in request.cookies:
        return redirect('/login')

    return render_template('index.html')

@app.route('/login')
def sub_index():
    return render_template('login.html')

def save_transaction(transaction):
    # Validate Balance
    if 'balance_id' in transaction:
        balance = Balance.query.filter_by(public_id=transaction['balance_id']).first()
        if not balance:
            return {'error' : 'Balance not found. Transaction rejected.'}
    else:
        return {'error' : 'Balance not found. Transaction rejected.'}

    # Validate Payee
    transaction['payee'] = str(transaction['payee']).strip(' ')
    if 'payee' in transaction:
        if len(transaction['payee']) == 0:
            return {'error' : 'Payee not specified. Transaction rejected.'}
    else:
        return {'error' : 'Payee not specified. Transaction rejected.'}

    # Validate Date
    if 'date' in transaction:
        date = transaction['date']
        date = date.split('-')

        if len(date) == 3:
            try:
                date = datetime.date(int(date[0]), int(date[1]), int(date[2]))
            except ValueError:
                return {'error' : 'Date in wrong format (req. YYYY-MM-DD). Transaction rejected.'}
        else:
            return {'error' : 'Date in wrong format (req. YYYY-MM-DD). Transaction rejected.'}
    else:
        return {'error' : 'Date in wrong format (req. YYYY-MM-DD). Transaction rejected.'}

    entries = None
    valid_entries = 0
    missing_amount = None

    # Validate Entries
    if 'entries' in transaction:
        entries = transaction['entries']
        balance_amount = Decimal(0.0)

        for entry in entries:
            if 'account' not in entry or 'amount' not in entry:
                continue

            entry['account'] = str(entry['account']).strip(' ')
            entry['amount'] = str(entry['amount']).strip(' ')

            if len(entry['account']) == 0 and len(entry['amount']) == 0:
                continue

            sub_accounts = entry['account'].split(':')
            for sub_account in sub_accounts:
                if len(str(sub_account).strip(' ')) == 0:
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

            if len(entry.get('account', '')) == 0:
                return {'error' : 'Account not specified. Transaction rejected.'}
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


    # Submit Transaction
    submitted_transaction = None
    if 'id' in transaction:
        submitted_transaction = Transactions.query.filter_by(id=transaction['id']).first()
        if submitted_transaction:
            submitted_transaction.payee = transaction['payee']
            submitted_transaction.date = date
        old_entries = Entry.query.filter_by(transaction_id=transaction['id']).all()
        for old_entry in old_entries:
            db.session.delete(old_entry)
    else:
        submitted_transaction = Transactions(balance_id = transaction['balance_id'],
                              payee = transaction['payee'],
                              date = date)
        db.session.add(submitted_transaction)
    db.session.commit()

    if entries is not None:
        for entry in entries:
            if len(entry['account']) == 0 and len(entry['amount']) == 0:
                continue

            new_entry = Entry(transaction_id = submitted_transaction.id,
                              balance_id = transaction['balance_id'],
                              account = entry['account'],
                              amount = entry['amount'])
            db.session.add(new_entry)
    db.session.commit()
    return {'message' : 'Transaction saved.'}

@app.route('/api/accounts', methods=['GET'])
@cross_origin()
@token_required
def get_accounts(current_balance):
    filters = request.args
    accounts = request.args.getlist('account')
    balance_id = None

    if current_balance:
        balance_id = current_balance
    elif request.cookies.get('balance_id'):
        balance_id = request.cookies.get('balance_id')

    else:
        return jsonify({'error': 'No balance specified.'})

    transactions = Transactions.query.filter(Transactions.balance_id == balance_id)
    entries = []
    filtered_entries = []

    if 'date_from' in filters:
        transactions = transactions.filter(Transactions.date >= filters['date_from'])
    if 'date_to' in filters:
        transactions = transactions.filter(Transactions.date <= filters['date_to'])

    entries = Entry.query.filter(Entry.transaction_id.in_(
        [t.id for t in transactions.all()])).order_by(Entry.account)

    if 'account' in filters:
        for account in accounts:
            filtered_entries += entries.filter(Entry.account.like('%'+account+'%')).all()
    else:
        filtered_entries = entries

    accounts = []

    for entry in filtered_entries:
        account_found = False
        for account in accounts:
            if account['name'] == entry.account:
                account['balance'] += entry.amount
                account_found = True
        if not account_found:
            accounts.append({'name':entry.account,
                             'balance':entry.amount})

    for account in accounts:
        account['balance'] = get_formatted_decimal(account['balance'])

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

def populate_balance(balance_id):
    try:
        with open('demo.json', 'r') as demo:
            data = demo.read()

        transactions = json.loads(data)
    except:
        print("Loading demo template failed")

    for transaction in transactions:
        transaction['balance_id'] = balance_id
        save_transaction(transaction)

