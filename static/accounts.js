var ACCOUNTS = (function(acc) {

    acc.PARENT_DIV = null;

    acc.loadFromJson = (accounts) => {
        if (accounts == null)
            return null;

        let parsed_accounts = [];

        accounts.forEach(account => {
            let sub_accounts = account['name'].split(':');

            parseSubAccounts(sub_accounts, parseFloat(account['balance']), parsed_accounts, depth=0);
        });

        return parsed_accounts;
    }

    let parseSubAccounts = (accounts, balance, array, depth) => {
        let account = {};
        let account_found = false;

        account['name'] = accounts.shift();
        account['balance'] = balance;
        account['sub_accounts'] = [];

        array.forEach(element => {
            if (element['name'] == account['name']) {
                account_found = true;
                element['balance'] += account['balance'];
                parseSubAccounts(accounts, balance, element['sub_accounts'], depth+1);
            }
        });

        if (!account_found) {
            array.push(account);
            if (accounts.length > 0)
                parseSubAccounts(accounts, balance, account['sub_accounts'], depth+1);
        }

    }

    acc.calculateBalance = (accounts_list) => {
        let balance = Decimal('0');

        accounts_list.forEach(account => {
            balance = balance.plus(Decimal(account['balance']))
        });

        return balance;
    }

    let drawRow = (account, depth) => {
        const account_row = document.createElement('div');

        const current_row_container = document.createElement('div');
        const collapsed_button_container = document.createElement('div');
        const account_row_name = document.createElement('div');
        const account_row_balance = document.createElement('div');

        if (depth > 1)
            account_row.classList.add('collapsed');

        account_row.addEventListener("click", (e) => {
            e.stopPropagation();
            console.log('clicked');
            if (account_row.classList.contains('collapsed'))
                account_row.classList.remove('collapsed');
            else
                account_row.classList.add('collapsed');
        });

        current_row_container.classList.add('account-current-row-container');
        collapsed_button_container.classList.add('collapsed-button-container');

        if (account['sub_accounts'].length > 0) {
            collapsed_button_container.innerHTML = `<i class="gg-select"></i>`;
            current_row_container.classList.add('account-collapsable');
        }

        account_row.classList.add('account-row');
        account_row_name.classList.add('account-row-name');
        account_row_balance.classList.add('account-row-balance');

        account_row_balance.classList.add('entry-amount');
        account_row_name.innerText = account.name;
        account_row_balance.innerText = formatNumber(account.balance);

        current_row_container.appendChild(collapsed_button_container);
        current_row_container.appendChild(account_row_name);
        current_row_container.appendChild(account_row_balance);
        account_row.appendChild(current_row_container);
        
        // account_row.style.paddingLeft = (depth+1)+'em';

        if (depth > 1)
            account_row.style.color = '#666666';
        account_row.classList.add('account-depth-'+depth);

        if (account['sub_accounts'].length > 0) {
            account['sub_accounts'].forEach(sub_account => {
                account_row.appendChild(drawRow(sub_account, depth+1));
            });
        }

        return account_row;
    }

    acc.drawAll = (accounts) => {
        let depth = 0;
        const accounts_table = document.createElement('div');

        accounts_table.classList.add('accounts-wrapper');

        if (accounts != null) {
            accounts = acc.loadFromJson(accounts['accounts']);
            const balance = acc.calculateBalance(accounts);

            accounts_table.appendChild(drawRow({'name':'Suma','balance':balance,'sub_accounts':[]}, 0));
            accounts.forEach(account => {
                accounts_table.appendChild(drawRow(account, 0, accounts_table));
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
                        clearElement(acc.PARENT_DIV);
                        acc.PARENT_DIV.appendChild(ACCOUNTS.drawAll(data));
                    }
        );
    }

    return acc;
 
}(ACCOUNTS || {}));
