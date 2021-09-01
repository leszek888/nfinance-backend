## Table of contents
* [General info](#general-info)
* [Technologies](#technologies)
* [Usage](#usage)

# General info
nFinance is a personal accounting software inspired by commad line tool "ledger-cli"

You're viewing the backend github page, to visint frontend go to https://github.com/leszek888/nfinance-frontend

You can find the current demo version of nFinance on https://nbudget.eu/

## Technologies
Project is created using following technologies:
* Python 3
* Flask

## Usage
* [Balance](#balance)
* [Transactions](#transactions)
* [Accounts](#accounts)
* [Auth](#auth)

## Balance
To create new balance sheet, send following request:

```
[GET] /api/balance/new
```
This will create a new balance sheet, and it will return balance_id, which has to be sent in all of the following requests as a cookie.

Returns:
```
{
  'balance_id': balance_id
}
```

## Transactions

### Submit new transaction

To submit new transactions, used the following request:

```
[POST] /api/transaction

Body:
{
  'date': 'YYYY-MM-DD',
  'payee': 'Payee',
  'entries':
  [
    { 'account': 'Account:Name', 'amount':'10' },
    { 'account': 'Account:Name', 'amount':'-10' },
  ]
}
```

You have to specify the date of the transaction, Payee's name, and at least two entries, containing account's name and amount. Entries have to balance out to zero. You can leave amount of one's entry empty, backend will automatically calculate the amount needed to balance out the transaction and fill it out in place of missing amount.

### Edit transaction

To edit transaction, use the same request as for submitting new transaction, but include edited transaction's ID in the request's body.

### Get all transactions

To get all of the transactions, use the following request:
```
[GET] /api/transaction
```

### Removing transaction

To remove a specific transaction send the following request:

```
[DELETE] /api/transaction

Body:
{
  'id': 'Transaction\'s ID'
}
```
Send transaction's ID in request's body.

## Accounts

### Get all accounts 

To get all of the accounts used in balance sheet along with their balances, use the following request:

```
[GET] /api/accounts
```

#### Filters

You can add filters to /api/accounts request, to calculate balances only in specified time frame or only for specific accounts.
List of possible filters:

```
  ?date_from=YYYY-MM-DD
  ?date_to=YYYY-MM-DD
  ?account=FirstAccount&account=SecondAccount&account=ThirdAccount
```

## Auth

Authorization is still in development. As of now, Basic Auth is used, use balance_id as login, and send empty password, encode with base64.
JWT Token without expiry date will be generated for requeted balance_id, which has to sent in each subsequent request as 'x-access-token'

Use the following requets to get the token:

```
[GET] /api/auth
Headers: 'Authorization': 'Basic balance_id:pw'
```
