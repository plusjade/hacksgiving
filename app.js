
var D3 = {
    derp : function(payload) {
          // d3
          var margin = {top: 30, right: 20, bottom: 0, left: 30},
              cardWidth = 100,
              width = 2000 - margin.left - margin.right,
              height = 700 - margin.top - margin.bottom;

          var svg = d3.select("#world").append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var parseDate = d3.time.format("%Y/%m/%d").parse;
            var parseBirthday = d3.time.format("%m/%d").parse;

            // prep data
            payload.forEach(function(d) {
              d._date = d.date;
              d.date = parseDate(d.date);
              d.birthday = parseBirthday(d.birthday);
              validateData(d);
            });

            var x = d3.time.scale();
            x.domain(d3.extent(payload, function(d) { return d.date }));
            var maxExtent = x.domain()[1];

            var departments = _.map(payload, function(d) {
              return d.department || 'none';
            })
            departments = _.uniq(departments);

            var content = '';
            _.each(departments, function(d){
              content += '<li><button>'+d+'</button></li>';
            })
            $("#key").append(content);

          $('#key').on('click', 'button', function(e){
              e.preventDefault();
              var filter = $(this).text();
              if(filter === "All") {
                  timeline(payload, D3._timeline_type);
              } else {
                  var data = _.where(payload, { department: filter });
                  timeline(data, D3._timeline_type);
              }
          })


          timeline(payload);



          function timeline(data, type) {

            var formatDate = (type === 'birthday') ? d3.time.format("%d %b") : d3.time.format("%d %b %Y");
            var color = d3.scale.category20();

            var y = d3.scale.linear()
                .range([0, height]);
            y.domain([0,10]);
            var yAxis = d3.svg.axis().scale(y).orient("left");


            var x = d3.time.scale();

            if(data.length === 1) {
                if(type === 'birthday')
                    x.domain([data[0].birthday]);
                else
                    x.domain([data[0].date, maxExtent]);
            }
            else {
                x.domain(d3.extent(data, function(d) { return (type === 'birthday') ? d.birthday : d.date }));
            }


            x.range([0, width-cardWidth]); // account for the last card's width
            var tickFormat = (type === "birthday") ? d3.time.format("%b") : d3.time.format("%b %Y")
            var xAxis = d3.svg.axis()
                .scale(x)
                .tickFormat(tickFormat)
                .ticks(d3.time.months)
                .orient("top");


            d3.select('#status').html('');
            d3.select("#world").select("svg").transition().duration(500).attr("width", width)


            // sort the data based on date
            if (type === 'birthday')
                data = data.sort(function(a, b){ return (a.birthday > b.birthday) ? +1 : -1 ; })
            else
                data = data.sort(function(a, b){ return (a.date > b.date) ? +1 : -1 ; })

            // break data into vertical chunks for display.
            var i = 1;
            data.forEach(function(d) {
              if(i > 9) i = 1;
              d.y = (i);
              ++i;
            });


            svg.selectAll('g.axis').remove();
            svg.append("g")
                .attr("class", "x axis")
                .call(xAxis);

            // date entries
            var entries = svg.selectAll('g.entry').data(data, function(d) { return d.id });
            var entriesEnter = entries.enter().append("svg:g")
                  .attr('class', function(d) { return "entry "+ (d.department ? d.department.toLowerCase() : 'none') })
                  .attr("transform", function(d) { 
                    if(type === "birthday")
                        return "translate(" + x(d.birthday) + "," + y(d.y) + ")";
                    else
                        return "translate(" + x(d.date) + "," + y(d.y) + ")";
                  })

            entriesEnter.append("svg:text")
                .attr('class', 'date')
                .attr('x', 30)
                .attr('y', 15)
                .text(function(d){ return formatDate((type === "birthday") ? d.birthday : d.date) })
            entriesEnter.append('rect')
                .attr('x', -20)
                .attr('width', 42)
                .attr('height', 42)
                .attr('fill', 'transparent')
                .attr('stroke-width', '5')
            entriesEnter.append("svg:image")
                .attr('x', -19)
                .attr('y', 1)
                .attr('width', 40)
                .attr('height', 40)
                .attr('class', 'image')
                .attr("xlink:href", function(d) { return d.mugshot_url })
            entriesEnter.append("svg:text")
                .attr('x', 30)
                .attr('y', 29)
                .text(function(d){ return d.full_name })


            var entriesUpdate = entries.transition()
                .duration(1000)
                .attr("transform", function(d) { 
                    if(type === "birthday")
                        return "translate(" + x(d.birthday) + "," + y(d.y) + ")";
                    else
                        return "translate(" + x(d.date) + "," + y(d.y) + ")";
                })


            var entriesExit = entries.exit().transition()
                .style("fill-opacity", 0)
                .remove();
          }

          D3.timeline = timeline;

          function validateData(d) {
            if(d.date.getFullYear() < 2010) {
              var message = "Invalid Year Format: '" + d._date + "' Please use MM/DD/YYYY. On item: " + d.full_name;
              d3.select('#status').html(message);
              throw new Error(message);
            }

            return true;
          }
    }
}

var Data = {};
var User = Backbone.Model.extend({

})
var Users = Backbone.Collection.extend({
    model: User
})
var Group = Backbone.Model.extend({

})
var Groups = Backbone.Collection.extend({
    model: Group
})



var App = {
    start : function() {
        // TODO: load from localStorage
        if(App.session) { 
            console.log("session exists!");
            App.render();
        }
        else {
            yam.getLoginStatus(function(response) {
                if (response.authResponse) {
                    App.session = response;
                    App.render();
                }
                else {
                    yam.login(function (response) {
                        if (response.authResponse) {
                            console.dir(response);
                            App.session = response;
                            App.render();
                        }
                    });
                }
            });
        }
    }
    ,
    // render the UI
    render : function() {
        // current User
        var currentUserTemplate = $("#current-user-template").html();
        var $userWrapper = $("#current-user");
        var content = Mustache.render(currentUserTemplate, App.session.user);
        $userWrapper.append(content);

        // list users
        App.users().done(function(users) {
            Data.users = new Users(users);
            var template = '{{# users }}<li><img src="{{ mugshot_url }}"><span>{{ full_name }}</span></li>{{/ users }}';
            var content = Mustache.render(template, { users : users });
            var $users = $("#users");
            $users.append(content);

            // start timeline;
            var payload = Data.users.map(function(d){
                var month = (Math.floor(Math.random() * 12) + 1) + '';
                var day = (Math.floor(Math.random() * 28) + 1) + '';
                if(month.length === 1) month = "0" + month;
                if(day.length === 1) day = "0" + day;

                return {
                    id: d.id,
                    date: d.get('activated_at').split(' ')[0],
                    full_name: d.get('full_name'),
                    department: d.get('department'),
                    mugshot_url: d.get('mugshot_url'),
                    birthday: (month + "/" + day),
                    web_url: d.get('web_url')
                }
            })

            D3.derp(payload);
            $("#graphs").find('button').click(function(){
                var text = $(this).text();
                if(text === "Birthday") {
                    D3._timeline_type = 'birthday';
                    D3.timeline(payload, "birthday");
                }
                else {
                    D3._timeline_type = '';
                    D3.timeline(payload);
                }
            })


            // // List groups
            // App.groups().done(function(data) {
            //     console.log("list groups");
            //     Data.groups = new Groups(data);
            //     Data.groups.each(function(group) {
            //         _.each(group.get('users'), function(user) {
            //             var u = Data.users.get(user.id);
            //             if(u) {
            //                 if (u.groups) u.groups.push(group);
            //                 else u.groups = [group];
            //             }
            //         })

            //     })
            //     // var template = '{{# groups }}<li><img src="{{ mugshot_url }}"><span>{{ name }}</span></li>{{/ groups }}';
            //     // var content = Mustache.render(template, { groups : data });
            //     // var $groups = $("#groups");
            //     // $groups.append(content);
            // });
        });
    }
    ,

    // Data Endpoints
    // -----------------
    users : function() {
        var cacheName = 'global.users',
            cache,
            dfd = $.Deferred();

        if(cache = localStorage.getItem(cacheName)) {
            console.log("cache hit");
            dfd.resolve(JSON.parse(cache));
        }
        else {
            yam.request({
                url: "https://www.yammer.com/api/v1/users.json",
                method: "GET",
                success: function (users) { //print message response information to the console
                    console.log("request success");
                    console.log("cache MISS");
                    console.dir(users);
                    localStorage.setItem(cacheName, JSON.stringify(users));

                    dfd.resolve(users);
                },
                error: function (user) {
                    alert("There was an error with the request.");
                }
            });
        }

        return dfd.promise();
    }
    ,
    groups : function() {
        var self = this;
        var cacheName = 'global.groups',
            cache,
            dfd = $.Deferred();

        if(cache = localStorage.getItem(cacheName)) {
        //if(false) {
            console.log("cache hit");
            var data = JSON.parse(cache);
            dfd.resolve(data);
        }
        else {
            yam.request({
                url: "https://www.yammer.com/api/v1/groups.json",
                method: "GET",
                success: function (data) {
                    console.log("groups request success");
                    console.log("cache MISS");
                    var i = 0;
                    var times = data.length;
                    var intervalID = setInterval(function(){
                        var group = data[i];
                        console.log(i++);

                        if (i >= times) {
                            console.log("exit");
                            clearInterval(intervalID);
                            self.group_users(group).done(function(){
                                localStorage.setItem(cacheName, JSON.stringify(data));
                                dfd.resolve(data);
                            })
                        }
                        else {
                            dfd.then( self.group_users(group) );
                        }

                    }, 1500, data);
                },
                error: function (data) {
                    alert("There was an error with the request.");
                }
            });
        }

        return dfd.promise();
    }
    ,
    group_users : function(group) {
        var dfd = $.Deferred();
            yam.request({
                url: "https://www.yammer.com/api/v1/users/in_group/"+group.id+".json",
                method: "GET",
                success: function (data) {
                    console.log('resolve: ' + group.id)
                    group.users = data.users;
                    dfd.resolve(data.users);
                },
                error: function (data) {
                    console.log("There was an error with the request.");
                }
            });


        return dfd.promise();
    }
}


yam.connect.loginButton('#yammer-login', function (resp) {
    if (resp.authResponse) { 
        document.getElementById('yammer-login').innerHTML = 'Welcome to Yammer!';
    } 
});

App.start();
