
const SERVER_URL='http://localhost:3009';
const CLIENT_URL='http://localhost/journal';
window.SERVER_URL=SERVER_URL;
window.CLIENT_URL=CLIENT_URL;
function setUserId(id = -1) {
    var variable = id;
    window.variable = variable;
}
// Function to make AJAX requests
function ajaxRequest(method, url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                callback(null, JSON.parse(xhr.responseText));
            } else {
                callback(JSON.parse(xhr.response));
            }
        }
    };
    console.log("Submitting:")
    console.log(data)
    xhr.send(JSON.stringify(data));
}

document.getElementById('registerForm').addEventListener('submit', function (event) {
    event.preventDefault();
    console.log("Register called")
    var formData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value
    };
    ajaxRequest('POST', `${window.SERVER_URL}/register`, formData, function (error, response) {
        if (error) {
            document.getElementById('reg_message').innerHTML = 'Error: ' + error.error;
        } else {
            document.getElementById('reg_message').innerHTML = response.message;
            alert(response.message);
            window.location.href = `${window.CLIENT_URL}/login.html`;
        }
    });
});

// Function to display journal UI
function displayJournalUI() {
    document.getElementById('journalUI').classList.remove("d-none");
}

// Function to fill past journal entries table
function fillPastJournals(journals) {
    var tbody = document.querySelector('#pastJournals tbody');
    tbody.innerHTML = '';
    if (journals[0] !== undefined)
        journals.forEach(function (entry) {
            var row = document.createElement('tr');
            row.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.description}</td>
            <td>${entry.location}</td>
            <td>${entry.mood}</td>
            <td>${entry.goals_and_intentions}</td>
            <td>${entry.people_contacts}</td>
            <td><button class="editBtn" data-id="${entry.id}">Edit</button></td>
        `;
            tbody.appendChild(row);
        });
    var editButtons = document.getElementsByClassName('editBtn');
    for (var i = 0; i < editButtons.length; i++) {
        editButtons[i].classList.add("form-control");
    }
}
function fillUsers(users) {
    var tbody = document.querySelector('#users tbody');
    tbody.innerHTML = '';
    if (users[0] !== undefined)
        users.forEach(function (entry) {
            var row = document.createElement('tr');
            row.innerHTML = `
            <td>${entry.id}</td>
            <td>${entry.username}</td>
            <td>${entry.email}</td>
            <td>${entry.phone}</td>
            <td>${entry.logged_status}</td>
            <td>${entry.journals}</td>
        `;
            tbody.appendChild(row);
        });
}

// Add event listener for dynamically added edit buttons
document.getElementById('pastJournals').addEventListener('click', function (event) {
    if (event.target.classList.contains('editBtn')) {
        var entryId = event.target.dataset.id;
        var row = event.target.closest('tr');
        var cells = row.querySelectorAll('td');
        var date = cells[0].textContent;
        var description = cells[1].textContent;
        var location = cells[2].textContent;
        var mood = cells[3].textContent;
        var goals_and_intentions = cells[4].textContent;
        var people_contacts = cells[5].textContent;

        // Fill the form with the data from the clicked row
        document.getElementById('date').value = date;
        document.getElementById('description').value = description;
        document.getElementById('location').value = location;
        document.getElementById('mood').value = mood;
        document.getElementById('goals').value = goals_and_intentions;
        document.getElementById('contacts').value = people_contacts;
        document.getElementById('entryId').value = window.variable;

        // Optionally, scroll to the top of the form for better visibility
        document.getElementById('journalForm').scrollIntoView({ behavior: 'smooth' });
    }
});


document.getElementById('go_to_login').addEventListener('click', function (event) {
    event.preventDefault();
    window.location.href = `${window.CLIENT_URL}/login.html`;
});
document.getElementById('go_to_register').addEventListener('click', function (event) {
    event.preventDefault();
    window.location.href = `${window.CLIENT_URL}/register.html`;
});
// User Login form submission
document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };
    ajaxRequest('POST', `${window.SERVER_URL}/login`, formData, function (error, response) {
        if (error) {
            document.getElementById('log_message').innerHTML = 'Error: ' + error.error;
            console.log(error)
        } else {
            document.getElementById('log_message').innerHTML = response.message ?? '';
            if (response.journal) {
                document.getElementById('log').classList.add("d-none");
                console.log(response.journal)
                setUserId(response.journal[0] == undefined ? response.journal.user_id : response.journal[0].user_id);
                document.getElementById('entryId').value = window.variable;
                displayJournalUI();
                fillPastJournals(response.journal);
            }
        }
    });
});
// Admin Login form submission
document.getElementById('adminForm').addEventListener('submit', function (event) {
    console.log("Hello admin");
    event.preventDefault();
    var formData = {
        adminId: document.getElementById('adminId').value,
        password: document.getElementById('password').value
    };
    console.log(formData);
    ajaxRequest('POST', `${window.SERVER_URL}/adminLogin`, formData, function (error, response) {
        if (error) {
            document.getElementById('log_message').innerHTML = 'Error: ' + error.error;
            console.log(error)
        } else {
            document.getElementById('log_message').innerHTML = response.message ?? '';
            if (response.users) {
                document.getElementById('admin').classList.add("d-none");
                console.log(response.users);
                fillUsers(response.users);
                document.getElementById('users').classList.remove("d-none");
            }
        }
    });
});

// Logout form submission
document.getElementById('logout').addEventListener('click', function (event) {
    event.preventDefault();
    var formData = {
        user_id: window.variable
    };
    ajaxRequest('POST', `${window.SERVER_URL}/logout`, formData, function (error, response) {
        if (error) {
            document.getElementById('journal_message').innerHTML = 'Error: ' + error.error;
        } else {
            document.getElementById('journal_message').innerHTML = response.message;
            if (response.message) {
                setUserId();
                alert(response.message);
                window.location.href = `${window.CLIENT_URL}/login.html`;
            }
        }
    });
});
document.getElementById('logoutAdmin').addEventListener('click', function (event) {
    event.preventDefault();
    var formData = {
        user_id: window.variable
    };
    ajaxRequest('POST', `${window.SERVER_URL}/adminLogout`, formData, function (error, response) {
        if (error) {
            document.getElementById('log_message').innerHTML = 'Error: ' + error.error;
        } else {
            document.getElementById('log_message').innerHTML = response.message;
            if (response.message) {
                alert(response.message);
                location.reload();
                //window.location.href = `${window.CLIENT_URL}/login.html`;
                
            }
        }
    });
});



// Journal entry form submission
document.getElementById('journalForm').addEventListener('submit', function (event) {
    event.preventDefault();
    console.log("Add entries called");
    var formData = {
        user_id: window.variable,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
        location: document.getElementById('location').value,
        mood: document.getElementById('mood').value,
        goals_and_intentions: document.getElementById('goals').value,
        people_contacts: document.getElementById('contacts').value
    };
    ajaxRequest('POST', `${window.SERVER_URL}/journal_save`, formData, function (error, response) {
        if (error) {
            document.getElementById('journal_message').innerHTML = 'Error: ' + error.error;
        } else {
            document.getElementById('journalForm').reset();
            document.getElementById('journal_message').innerHTML = response.message;
            fillPastJournals(response.journal);
        }
    });
});

// Add event listener for dynamically added edit buttons
document.getElementById('pastJournals').addEventListener('click', function (event) {
    if (event.target.classList.contains('editBtn')) {
        var entryId = event.target.dataset.id;
        document.getElementById('editEntry').classList.remove("d-none");

        document.getElementById('editEntry').addEventListener('click', function (event) {
            document.getElementById('editEntry').classList.add("d-none");
            var formData = {
                id: parseInt(entryId),
                user_id: window.variable,
                date: document.getElementById('date').value,
                description: document.getElementById('description').value,
                location: document.getElementById('location').value,
                mood: document.getElementById('mood').value,
                goals_and_intentions: document.getElementById('goals').value,
                people_contacts: document.getElementById('contacts').value
            };
            ajaxRequest('PUT', `${window.SERVER_URL}/journal_edit`, formData, function (error, response) {
                if (error) {
                    document.getElementById('journal_message').innerHTML = 'Error: ' + error.error;
                } else {
                    document.getElementById('journalForm').reset();
                    document.getElementById('journal_message').innerHTML = response.message;
                    fillPastJournals(response.journal);
                }
            });
        });
    }
});


