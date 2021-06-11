
var ACCOUNTS = (function(acc) {

    let BALANCE = new Decimal('0');
    let LOADED_ACCOUNTS = null;
    let LOADED_BALANCE = null;
    let LOADED_CASH_FLOW = null;
    let LOADED_NET_WORTH = null;

    acc.PARENT_DIV = null;

    let loadFromJson = (accounts) => {
        let parsed_accounts = [];
        BALANCE = Decimal('0');

        accounts.forEach(account => {
            let sub_accounts = account['name'].split(':');

            addAccount(sub_accounts, parseFloat(account['balance']), parsed_accounts, depth=0);
        });

        parsed_accounts.forEach(account => {
            BALANCE = BALANCE.plus(Decimal(account['balance']));
        });

        return parsed_accounts;
    }

    let addAccount = (accounts, balance, array, depth) => {
        let account = {};
        let account_found = false;

        account['name'] = accounts.shift();
        account['balance'] = balance;
        account['sub_accounts'] = [];

        array.forEach(element => {
            if (element['name'] == account['name']) {
                account_found = true;
                element['balance'] += account['balance'];
                addAccount(accounts, balance, element['sub_accounts'], depth+1);
            }
        });

        if (!account_found) {
            array.push(account);
            if (accounts.length > 0)
                addAccount(accounts, balance, account['sub_accounts'], depth+1);
        }

    }

    let drawAccount = (account, depth, parent) => {
        const account_row = drawRow(account['name'], account['balance']);

        account_row.style.paddingLeft = (depth+1)+'em';
        if (depth > 1)
            account_row.style.color = '#666666';
        account_row.classList.add('account-depth-'+depth);
        parent.appendChild(account_row);

        if (account['sub_accounts'].length > 0) {
            account['sub_accounts'].forEach(sub_account => {
                drawAccount(sub_account, depth+1, parent);
            });
        }
    }

    let drawRow = (account_name, balance, parent) => {
        const account_row = document.createElement('div');
        const account_row_name = document.createElement('div');
        const account_row_balance = document.createElement('div');

        account_row_balance.classList.add('entry-amount');
        account_row.classList.add('account-row');
        account_row_name.innerText = account_name;
        account_row_balance.innerText = formatNumber(balance);

        account_row.appendChild(account_row_name);
        account_row.appendChild(account_row_balance);
        
        return account_row;
    }

    acc.drawAll = (accounts) => {
        let depth = 0;
        const accounts_table = document.createElement('div');

        accounts_table.classList.add('accounts-wrapper');

        if (accounts != null) {
            accounts = loadFromJson(accounts['accounts']);

            drawAccount({'name':'Suma','balance':BALANCE,'sub_accounts':[]}, 0, accounts_table);
            accounts.forEach(account => {
                drawAccount(account, 0, accounts_table);
            });
        }

        return accounts_table;
    }

    acc.loadAndDisplayInParent = (filters=null) => {
        sendRequest("POST", "/api/accounts",
                    {'balance_id':BALANCE_ID,
                     'filters':filters
                    },
                    (data) => {
                        if (data != null)
                            LOADED_ACCOUNTS = data;

                        clearElement(acc.PARENT_DIV);
                        acc.PARENT_DIV.appendChild(ACCOUNTS.drawAll(data));
                    }
        );
    }

    return acc;
 
}(ACCOUNTS || {}));
