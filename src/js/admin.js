App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,

  init: function () {
    return App.initWeb3();
  },

  initWeb3: function () {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      const ethEnabled = () => {
        if (window.ethereum) {
          window.web3 = new Web3(window.ethereum);
          return true;
        }
        return false;
      };
      if (!ethEnabled()) {
        alert(
          'Please install an Ethereum-compatible browser or extension like MetaMask to use this dApp!'
        );
      }
      web3 = window.web3;
      App.web3Provider = web3.currentProvider;
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider(
        'http://localhost:7545'
      );
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function () {
    $.getJSON('Election.json', function (election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);

      App.listenForEvents();

      return App.render();
    });
  },

  // Listen for events emitted from the contract
  listenForEvents: function () {
    App.contracts.Election.deployed().then(function (instance) {
      // Restart Chrome if you are unable to receive this event
      // This is a known issue with Metamask
      // https://github.com/MetaMask/metamask-extension/issues/2393
      instance
        .votedEvent(
          {},
          {
            fromBlock: 0,
            toBlock: 'latest',
          }
        )
        .watch(function (error, event) {
          console.log('event triggered', event);
          // Reload when a new vote is recorded
          App.render();
        });
    });
  },

  render: async () => {
    var electionInstance;
    var loader = $('#loader');
    var content = $('#content');

    loader.show();
    content.hide();

    // Load account data
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      App.account = accounts[0];
      $('#accountAddress').html('Your Account: ' + App.account);
    } catch (error) {
      if (error.code === 4001) {
        // User rejected request
      }
      console.log(error);
    }

    // Load contract data
    App.contracts.Election.deployed()
      .then(function (instance) {
        electionInstance = instance;
        return electionInstance.candidatesCount();
      })
      .then(async (candidatesCount) => {
        const promise = [];
        for (var i = 1; i <= candidatesCount; i++) {
          promise.push(electionInstance.candidates(i));
        }

        const candidates = await Promise.all(promise);
        var candidatesResults = $('#candidatesResults');
        candidatesResults.empty();

        var candidatesSelect = $('#candidatesSelect');
        candidatesSelect.empty();

        for (var i = 0; i < candidatesCount; i++) {
          var id = candidates[i][0];
          var name = candidates[i][1];

          // Render candidate Result
          var candidateTemplate =
            '<tr><th>' +
            id +
            '</th><td>' +
            name +
            '</td><td>'
          candidatesResults.append(candidateTemplate);

          // Render candidate ballot option
          var candidateOption =
            "<option value='" + id + "' >" + name + '</ option>';
          candidatesSelect.append(candidateOption);
        }
        return electionInstance.voters(App.account);
      })
      .then(function (hasStarted) {
        // Do not allow a user to vote
        if (hasStarted) {
          $('form').hide();
        }
        loader.hide();
        content.show();
      })
      .catch(function (error) {
        console.warn(error);
      });
  },


  arrHead: new Array(),
  arrHead: ['', 'Candidate Name'], // table headers.
  // first create a TABLE structure by adding few headers.
  createTable: function() {
      
      let candidateTable = document.createElement('table');
      candidateTable.setAttribute('id', 'candidateTable');  // table id.

      let tr = candidateTable.insertRow(-1);
      let arrHead = ['', 'Candidate Name'];

      for (let h = 0; h < arrHead.length; h++) {
          let th = document.createElement('th'); // the header object.
          th.innerHTML = arrHead[h];
          tr.appendChild(th);
      }

      let div = document.getElementById('cont');
      div.appendChild(candidateTable);    // add table to a container.
  },

  // function to add new row.
  addRow: function() {
      let candTab = document.getElementById('candidateTable');

      let rowCnt = candTab.rows.length;    // get the number of rows.
      let tr = candTab.insertRow(rowCnt); // table row.
      tr = candTab.insertRow(rowCnt);

      for (let c = 0; c < 2; c++) {
          let td = document.createElement('td');          // table definition.
          td = tr.insertCell(c);

          if (c == 0) {   // if its the first column of the table.
              // add a button control.
              let button = document.createElement('input');

              // set the attributes.
              button.setAttribute('type', 'button');
              button.setAttribute('value', 'Remove');

              // add button's "onclick" event.
              button.setAttribute('onclick', 'App.removeRow(this)');

              td.appendChild(button);
          }
          else {
              // the 2nd, 3rd and 4th column, will have textbox.
              let ele = document.createElement('input');
              ele.setAttribute('type', 'text');
              ele.setAttribute('value', '');

              td.appendChild(ele);
          }
      }
  },

  // function to delete a row.
  removeRow: function(oButton) {
      let candTab = document.getElementById('candidateTable');
      candTab.deleteRow(oButton.parentNode.parentNode.rowIndex); 
  },

  // function to extract and submit table data.
  submit: function() {

      var candidatesNames = $('#candidateNames');
      candidatesNames.empty(); 

      var candidatesName = new Array();

      let myTab = document.getElementById('candidateTable');
      //let arrValues = new Array();

      // loop through each row of the table.
      for (row = 1; row < myTab.rows.length - 1; row++) {
          // loop through each cell in a row.
          for (c = 0; c < myTab.rows[row].cells.length; c++) {
              let element = myTab.rows.item(row).cells[c];
              if (element.childNodes[0].getAttribute('type') == 'text') {
                  var candidateDetails = element.childNodes[0].value; 
                  candidatesName.push(candidateDetails);                      
              }
          }
      }

      App.contracts.Election.deployed()
        .then(function (instance) {
          for (i = 0; i < candidatesName.length; i++) {  
            instance.addCandidate(candidatesName[i], { from: App.account });
          }
        })
        .catch(function (err) {
          console.error(err);
        });
  },

};

$(function () {
  $(window).load(function () {
    App.init();
  });
});


