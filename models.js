var Epg    = require('./lib/epg')
,   conf   = require('./conf')
,   epg    = new Epg(conf.epg)
,   _      = require('underscore')
,   moment = require('moment')
,   status = require("./status_client")('gui')
;

status.set('status', 'running');

var Service = {
    "find": function(filter, callback) {
        try {
            var data = epg.listServices();
            if (filter) {
                if (filter.serviceId)
                    data = _.find(data, function(service) {return service.serviceId === parseInt(filter.serviceId);});
            }
            callback(undefined, data);
        } catch(e) {
            console.error("Error finding services", e.message);
            callback(e);
        }
    }, 
    "add": function(service, callback) {
        try {
            if (!service.serviceId) {
                var services = epg.listServices();
                if (services.length === 0)
                    service.serviceId = 1;
                else
                    service.serviceId = _.max(services, function(serv) {return serv.serviceId;}).serviceId + 1;
            }

            epg.addService(service);

            callback(undefined, service);
        } catch(e) {
            console.error("Error adding service", e.message);
            callback(e);
        }
    },
    "update": function(serviceId, service, callback) {
//        try {
//            service.serviceId = uuid.v1();
//            epg.addService(service);
//            callback(undefined, service);
//        } catch(e) {
//            callback(e);
//        }
        callback(new Error("UPDATE NOT IMPLEMENTED"));
    },
    "enable": function(serviceId, callback) {
        try {
            epg.enableDisableService(serviceId);
            var service = _.findWhere(epg.listServices(), {serviceId: parseInt(serviceId)});
            callback(undefined, service);
        } catch(e) {
            console.error("Error enabling/disabling service", e.message);
            callback(e);
        }
    }
};

var Event = {
    "find": function(filter, callback) {
        try {
            if (!filter)
                filter = {};

            var data = [];
            if (!filter.serviceId) {
                var services = epg.listServices();
                _.each(services, function(service) {
                    filter.serviceId = service.serviceId;
                    var events = epg.listEvents(filter);
                    data = _.union(events, data);
                });
            } else {
                data = epg.listEvents(filter);
            }
            data = _.map(data, Event.addService);
            callback(undefined, data);
        } catch(e) {
            console.error("Error finding events", e.message);
            callback(e);
        }
    }, 
    "addService": function(event) {
        event.service = _.find(epg.listServices(), function(service) {
            return (service.serviceId === event.serviceId);
        });
        return event;
    },
    "add": function(event, callback) {
        try {
            event = epg.addEvent(event);
            callback(undefined, Event.addService(event));
        } catch(e) {
            console.error("Error adding event", e.message);
            callback(e);
        }
    },
    "update": function(serviceId, service, callback) {
//        try {
//            service.serviceId = uuid.v1();
//            epg.addService(service);
//            callback(undefined, service);
//        } catch(e) {
//            callback(e);
//        }
        callback(new Error("UPDATE NOT IMPLEMENTED"));
    },
    "remove": function(eventId, callback) {
        try {
            var cant = epg.deleteEvents({eventId: eventId});
            if (cant === 0)
                callback(new Error('No event deleted'));
            else
                callback();
        } catch(e) {
            console.error("Error removing event", e.message);
            callback(e);
        }
    }
};

var Server = {
    lastEitUpdated : undefined,
    lastCarsouselUpdated: undefined,
    lastUpdateAttempt: undefined, 
    serverStarted: undefined,
    updateEit: function(callback) {
        if (!this.serverStarted)
            this.serverStarted = moment().format("YYYY-MM-DD HH:mm:ss");
        try {
            this.lastUpdateAttempt = moment().format("YYYY-MM-DD HH:mm:ss");
            var ret = epg.updateEit();
            if (ret) {
                this.lastEitUpdated = moment().format("YYYY-MM-DD HH:mm:ss");
                epg.updateCarousel();
                this.lastCarouselUpdated = moment().format("YYYY-MM-DD HH:mm:ss");
            }
            var server = {
                id: 1,
                lastEitUpdated : this.lastEitUpdated,
                lastCarouselUpdated: this.lastCarouselUpdated,
                lastUpdateAttempt: this.lastUpdateAttempt, 
                serverStarted: this.serverStarted
            };        
            callback(undefined, server);
        } catch(e) {
            console.log("Error updating eit and carousel", e);
            callback(e, false);
        }
    },
    get: function(callback) {
        status.getStatus(function(st) {
            var server = {
                id: 1,
                guiStarted : moment(st.gui.started).fromNow(), //moment(st.gui.started).format("YYYY-MM-DD HH:mm:ss"),
                guiStatus : st.gui.status,
                carouselStarted : moment(st.carousel.started).fromNow(), //moment(st.carousel.started).format("YYYY-MM-DD HH:mm:ss"),
                carouselStatus : st.carousel.status,
                importerStarted : moment(st.importer.started).fromNow(), //moment(st.importer.started).format("YYYY-MM-DD HH:mm:ss"),
                importerStatus : st.importer.status,
                importerLastRun : moment(st.importer.lastRun).fromNow(), //moment(st.importer.lastRun).format("YYYY-MM-DD HH:mm:ss"),
                importerNextRun : moment(st.importer.nextRun).from(moment()), //moment(st.importer.nextRun).format("YYYY-MM-DD HH:mm:ss"),
                eitUpdaterStarted : moment(st.eitUpdate.started).fromNow(), //moment(st.eitUpdate.started).format("YYYY-MM-DD HH:mm:ss"),
                eitUpdaterStatus : st.eitUpdate.status,
                eitUpdaterLastRun : moment(st.eitUpdate.lastRun).fromNow(), //moment(st.eitUpdate.lastRun).format("YYYY-MM-DD HH:mm:ss"),
                eitUpdaterNextRun : moment(st.eitUpdate.nextRun).from(moment()) //moment(st.eitUpdate.nextRun).format("YYYY-MM-DD HH:mm:ss"),
            };
            callback(undefined, server);
        });
    }
};
module.exports = {
    Service: Service,
    Event: Event,
    Server: Server
};
