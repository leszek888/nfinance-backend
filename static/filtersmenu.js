"use strict";

var FiltersMenu = function(fm) {
    function update(filter_input) {
        filter_input.dispatchEvent(new CustomEvent('filters-updated', {bubbles: true}));
    }

    function removeFilters(filter_input) {
        filter_input.parentNode.parentNode.querySelectorAll('input').forEach(input => {
            input.value = "";
        });
    }

    class SimpleFilter extends HTMLElement {
        constructor() {
            super();

            this.innerHTML = `
                <div class="filter">
                    <span class="filter-label">${this.getAttribute('title')}</span>
                    <input type="text" name="${this.getAttribute('name')}"></input>
                </div>
            `;
        }
    }

    class DateFilter extends HTMLElement {
        constructor() {
            super();

            this.innerHTML = `
                        <style>
                            .date-selection-active {
                                pointer-events: auto;
                            }
                            .date-from-to {
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                            }
                            .filter-cell {
                                margin: 2pt;
                            }
                        </style>
                        <div class="date-filters filter">
                            <span class="filter-label">Period</span>
                            <select>
                                <option selected="selected" value="all_time">All Time</option>
                                <option value="month_current">This Month</option>
                                <option value="month_last">Last Month</option>
                                <option value="year_current">Current Year</option>
                                <option value="custom">Custom Period</option>
                            </select>
                            <div class="date-from-to">
                                <div class="filter-cell">
                                    <span class="filter-label">From: </span><input type="text" name="date_from"></input>
                                </div>
                                <div class="filter-cell">
                                    <span class="filter-label">To: </span><input type="text" name="date_to"></input>
                                </div>
                            </div>
                        </div>
            `;
            this.querySelector('select').addEventListener("change", () => {this.updateDateFilter()});
        }

        updateDateFilter() {
            const period_fields = this.querySelector(".date-from-to");
            const select_field = this.querySelector("select");

            let start_date = new Date();
            let end_date = new Date();

            period_fields.style.maxHeight = null;

            if (select_field.value == 'custom') {
                start_date = null;
                end_date = null;

                period_fields.style.maxHeight = period_fields.scrollHeight;
                period_fields.querySelector('[name="date_from"]').focus();
            }
            else if (select_field.value == 'month_current') {
                start_date.setMonth(start_date.getMonth());
                start_date.setDate(1);
            }
            else if (select_field.value == 'month_last') {
                start_date.setMonth(start_date.getMonth()-1);
                start_date.setDate(1);

                end_date.setDate(1);
                end_date.setDate(end_date.getDate()-1);
            }
            else if (select_field.value == 'year_current') {
                start_date.setMonth(0);
                start_date.setDate(1);
            }
            else if (select_field.value == 'all_time') {
                start_date = null;
                end_date = null;
            }

            period_fields.querySelector('[name="date_from"]').value = formatDate(start_date);
            period_fields.querySelector('[name="date_to"]').value = formatDate(end_date);
        }
    }

    window.customElements.define('date-filter', DateFilter);
    window.customElements.define('simple-filter', SimpleFilter);

    fm.createMenu = (filters) => {
        const filter_menu = document.createElement('div');
        let filter_elements = '';

        filters.forEach(filter => {
            let filter_DOM = '';

            if (filter.type && filter.type == 'date')
                filter_elements += `<date-filter></date-filter>`;
            else
                filter_elements += `<simple-filter name="${filter.name}" title="${filter.title}"></simple-filter>`;
        });

        filter_menu.classList.add('filter-menu');
        filter_menu.innerHTML = `
            <style>
                @import url('https://css.gg/close-o.css');
                @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css');
                .filters-parent {
                    width: 100%;
                }

                .filters-container {
                    display: flex;
                    justify-content: space-evenly;
                    background-color: #fafafa;
                }
                
                .filters-subwindow {

                }

                .filter {
                    min-height: 80pt;
                    padding: 5pt;
                    margin-top: 5pt;
                    padding-top: 10pt;
                    max-width: 300px;
                    border-radius: 10px;
                    box-sizing: border-box;
                }

                @media (max-width: 640px) {
                    .filters-container {
                        display: grid;
                    }
                    .filter {
                        max-width: 100%;
                    }
                }


                .filter-toggle-button {
                    width: 100%;
                    border: 0px;
                    padding: 10pt;
                    background-color: #ddd;
                    border-radius: 10px 10px 0px 0px;
                }

                .filters-footer {
                    border-radius: 0px 0px 10px 10px;
                    padding: 5px;
                    padding-left: 15px;
                    padding-right: 15px;
                    background-color: #eee;
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    box-sizing: border-box;
                }

                .filter-toggle-button:active {
                    filter: brightness(0.9);
                }

                .filter input {
                    width: 100%;
                    font-size: 12pt;
                    border: 1px solid #999;
                    color: #444;
                    box-sizing: border-box;
                    padding: 4pt;
                    margin-bottom: 5pt;
                }

                .filter-label {
                    font-family: inherit;
                    position: relative;
                    font-size: 10pt;
                    box-sizing: border-box;
                    margin: 2pt;
                    margin-top: 5pt;
                }
                
                .apply-button {
                    max-width: 200px;
                    width: 100%;
                    height: 30px;
                    border: none;
                }

                .cancel-button {
                    max-width: 200px;
                    width: 100%;
                    height: 30px;
                    border: none;
                    color: #999;
                }
            </style>

            <div class="filters-parent">
                <button class="filter-toggle-button">Hide Filters</button>
                <div class="filters-subwindow">
                    <div class="filters-container">
                        ${filter_elements}
                    </div>
                    <div class="filters-footer">
                        <button class="apply-button"><i class="fa fa-check"></i> Apply</button>
                        <button class="cancel-button"><i class="fa fa-close"></i> Remove Filters</button>
                    </div>
                </div>
            </div>
        `;

        filter_menu.querySelector(".filter-toggle-button").addEventListener("click", () => toggleMenu(filter_menu));
        filter_menu.querySelector(".apply-button").addEventListener("click", ()=>update(filter_menu));
        filter_menu.querySelector(".cancel-button").addEventListener("click", ()=>removeFilters(filter_menu));
        filter_menu.addEventListener("change", ()=>update(filter_menu));

        return filter_menu;
    }

    function toggleMenu(filter_menu) {
        const menu = filter_menu.querySelector('.filters-subwindow');
        const button = filter_menu.querySelector('.filter-toggle-button');

        if (!menu.style.display) {
            button.innerText = 'Show Filters';
            menu.style.display = 'none';
        }
        else {
            button.innerText = 'Hide Filters';
            menu.style.display = null;
        }
    }

    fm.getFilterValues = (menu) => {
        const filter_inputs = menu.querySelectorAll('input');
        let filters = [];

        filter_inputs.forEach(input => {
            filters.push({'name':input.name, 'value':input.value});
        });

        return filters;
    }

    function formatDate(date) {
        if (date == null)
            return "";

        let day = date.getDate().toString();
        let month = (date.getMonth()+1).toString();
        let year = date.getFullYear();

        if (day.length == 1)
            day = '0' + day;

        if (month.length == 1)
            month = '0' + month;

        return `${year}-${month}-${day}`;
    }

    return fm;
}(FiltersMenu || {})

function initialize() {
    const filter_menu = FiltersMenu.createFilterMenu([
        {'name' : 'date', 'title' : 'Date', 'type': 'date'},
        {'name' : 'payee', 'title' : 'Payee'},
        {'name' : 'account', 'title' : 'Account'},
    ]);
    filter_menu.addEventListener('filters-updated', () => {
        console.log(FiltersMenu.getFilterValues(filter_menu));
    });
    document.querySelector('.main_content').appendChild(filter_menu);
}
