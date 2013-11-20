var Timeline = {
    // The payload represents the full dataset.
    // Views and filters will filter the global dataset.
    initialize : function(payload) {
        Timeline.render = render;

        // Update data relative to render modules.
        payload.forEach(function(d) {
            for(key in Timeline.Renderers) {
                Timeline.Renderers[key].process(d);
            }
        });
        this.payload = payload;

        var margin = {top: 30, right: 20, bottom: 0, left: 30},
            cardWidth = 100,
            width = 2000 - margin.left - margin.right,
            height = 700 - margin.top - margin.bottom;

        var svg = d3.select("#world").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // define a maxExtent for when filters return single result sets.
        var x = d3.time.scale();
        x.domain(d3.extent(payload, function(d) { return d.date }));
        var maxExtent = x.domain()[1];


        render(payload);


        function render(data, type) {
            var Renderer = (type === 'birthday') ? Timeline.Renderers.birthday : Timeline.Renderers.date;

            var color = d3.scale.category20();
            var y = d3.scale.linear().range([0, height]);
            y.domain([0,10]);
            var yAxis = d3.svg.axis().scale(y).orient("left");
            var x = d3.time.scale();
            if(data.length === 1) {
                x.domain([Renderer.attribute(data[0]), maxExtent]);
            }
            else {
                x.domain(d3.extent(data, function(d) { return Renderer.attribute(d) }));
            }

            x.range([0, width-cardWidth]); // account for the last card's width
            var xAxis = d3.svg.axis()
                .scale(x)
                .tickFormat(Renderer.tickFormat)
                .ticks(d3.time.months)
                .orient("top");


            data.sort(function(a, b){ return (Renderer.attribute(a) > Renderer.attribute(b)) ? +1 : -1 ; })
            data.forEach(function(d, i) {
                d._position = i+1;
            })

            var total = data.length;

            // break data into vertical chunks for display.
            var i = 1;
            data.forEach(function(d) {
              if(i > 9) i = 1;
              d.y = (i);
              ++i;
            });

            d3.select('#status').html('');
            d3.select("#world").select("svg").transition().duration(500).attr("width", width);
            svg.selectAll('g.axis').remove();
            svg.append("g").attr("class", "x axis").call(xAxis);

            var entries = svg.selectAll('g.entry').data(data, function(d) { return d.id });

            // ENTER
            var entriesEnter = entries.enter().append("svg:g")
                  .attr('class', function(d) { return "entry "+ (d.department ? d.department.toLowerCase() : 'none') })
                  .attr("transform", function(d) { 
                        return "translate(" + x(Renderer.attribute(d)) + "," + y(d.y) + ")";
                  })

            entriesEnter
                .on('mouseover', function(d) {
                    d3.select(this).select('g.tooltip').style('display', 'block')
                })
                .on('mouseout', function(d) {
                    d3.select(this).select('g.tooltip').style('display', 'none')
                })
            entriesEnter.append("svg:text")
                .attr('class', 'date')
                .attr('x', 30)
                .attr('y', 15)
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
                .attr('class', 'name')

            var tooltip = entriesEnter.append("svg:g")
                .attr('class', 'tooltip')
                .attr('transform', 'translate(30,-35)')
                .style("display", "none")
            tooltip.append("rect")
                .attr('width', 100)
                .attr('height', 30)
                .attr('class', 'tooltip-bg')
                .style("fill", "#eee")
                .style("stroke", "#ccc")
            tooltip.append("svg:text")
                .attr('x', 10)
                .attr('y', 17)
                .attr('class', 'tooltip')
                .text(function(d){ return "Hire #"+ d._position + " of " + total })
                .style("fill", "#333")


            // ENTER + UPDATE
            entries.selectAll("text.name")
                .text(function(d){ return d.full_name })
            entries.selectAll("text.date")
                .text(function(d){ return Renderer.formatDate( Renderer.attribute(d) ) })

            // UPDATE
            var entriesUpdate = entries.transition()
                .duration(1000)
                .attr("transform", function(d) { 
                    return "translate(" + x( Renderer.attribute(d) ) + "," + y(d.y) + ")";
                })


            // EXIT
            var entriesExit = entries.exit().transition()
                .style("fill-opacity", 0)
                .remove();
        }
    }
    ,
    show : function(type) {
        Timeline._timeline_type = type.toLowerCase();
        this.render(this.payload, this._timeline_type);
    }
    ,
    filterBy : function(attribute, filter) {
        if(filter === "All") {
            this.render(this.payload, this._timeline_type);
        }
        else {
            var criteria = {}
            criteria[attribute] = filter
            var data = _.where(this.payload, criteria);

            this.render(data, this._timeline_type);
        }
    }
    ,
    Renderers : {
        "birthday" : {
            formatDate : d3.time.format("%d %b")
            ,
            tickFormat : d3.time.format("%b")
            ,
            attribute  : function(d) {
                return d.birthday;
            }
            ,
            parseAttribute : d3.time.format("%m/%d").parse
            ,
            process : function(d) {
                d._birthday = d.birthday;
                d.birthday = this.parseAttribute(d.birthday);
            }
        }
        ,
        "date" : {
            formatDate : d3.time.format("%d %b %Y")
            ,
            tickFormat : d3.time.format("%b %Y")
            ,
            attribute  : function(d) {
                return d.date;
            }
            ,
            parseAttribute : d3.time.format("%Y/%m/%d").parse
            ,
            process : function(d) {
                d._date = d.date;
                d.date = this.parseAttribute(d.date);
            }
        }
    }
}

var Data = {};
var User = Backbone.Model.extend({

})
var Users = Backbone.Collection.extend({
    model: User
    ,
    timelinePayload : function() {
        var data =  this.map(function(d) {
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
        return data;
    }
    ,
    validateData : function(d) {
      if(d.date.getFullYear() < 2010) {
        var message = "Invalid Year Format: '" + d._date + "' Please use MM/DD/YYYY. On item: " + d.full_name;
        d3.select('#status').html(message);
        throw new Error(message);
      }

      return true;
    }

})
var Group = Backbone.Model.extend({

})
var Groups = Backbone.Collection.extend({
    model: Group
})

var CurrentUserView = Backbone.View.extend({
    model : User
    ,
    el : "#current-user"
    ,
    initialize : function() {
        this.template = $("#current-user-template").html();
        this.render();
    }
    ,
    render : function() {
        // TODO: find out why this.model is not a backbone model
        var content = Mustache.render(this.template, this.model);
        this.$el.append(content);
    }
})

var UsersView = Backbone.View.extend({
    collection : Users
    ,
    el : '#users'
    ,
    initialize : function() {
        this.template = '{{# users }}<li><img src="{{ mugshot_url }}"><span>{{ full_name }}</span></li>{{/ users }}';
    }
    ,
    render : function() {
        var content = Mustache.render(this.template, { users : this.collection });
        this.$el.append(content);
    }
})

var GroupsView = Backbone.View.extend({
    initialize : function() {
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
    }
})

var App = {

    start : function() {
        // apparently this function will wait on yam.connect so
        // will fire at any point the user uses the connect button.
        yam.getLoginStatus(
          function(response) {
            if (response.authResponse) {
                App.render(response);
            }
          }
        );

        yam.connect.loginButton('#yammer-login', function (resp) {
            if (resp.authResponse) { 
                document.getElementById('yammer-login').innerHTML = '';
            } 
        });
    }
    ,

    render : function(session) {
        new CurrentUserView({ model: session.user });

        // list users
        App.users().done(function(users) {

            Data.users = new Users(users);
            var payload = Data.users.timelinePayload();

            // start timeline;
            Timeline.initialize(payload);

            $("#graphs").find('button').click(function() {
                var text = $(this).text();
                Timeline.show(text);
            })

            // departments
            var departments = _.map(payload, function(d) { return d.department || 'none'; })
            departments = _.uniq(departments);
            var content = '';
            _.each(departments, function(d){ content += '<li><button>'+d+'</button></li>'; })
            $("#key")
                .append(content)
                .on('click', 'button', function(e) {
                    e.preventDefault();
                    var filter = $(this).text();
                    Timeline.filterBy('department', filter);
                })
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


App.start();
