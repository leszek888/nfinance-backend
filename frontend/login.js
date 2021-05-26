'use strict';

function loadBalance() {
    document.cookie = "balance_id="+document.getElementById('login_balance_id').value;
    window.location.replace('index.html');
}

function createBalance() {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const data = JSON.parse(this.responseText);
            if ('error' in data || 'message' in data) {
                displayPopup(data);
            }
            else {
                document.cookie = "balance_id="+data['balance_id'];
                window.location.replace('index.html');
            }

            const form = document.createElement('form');
            const balance_id = document.createElement('input');
            balance_id.type = 'hidden';
            balance_id.name = 'balance_id';
            balance_id.value = data['balance_id'];
            form.appendChild(balance_id);

            form.method = 'POST';
            form.action = 'index.html';
            form.submit();
        }
    };

    xhttp.open("GET", "http://localhost:5000/balance/new", true);
    xhttp.send();
}

