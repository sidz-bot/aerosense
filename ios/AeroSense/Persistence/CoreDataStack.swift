//
//  CoreDataStack.swift
//  AeroSense
//
//  Core Data stack for local persistence
//

import CoreData
import CloudKit

class CoreDataStack {
    static let shared = CoreDataStack()

    lazy var persistentContainer: NSPersistentCloudKitContainer = {
        let container = NSPersistentCloudKitContainer(name: "AeroSense")

        // CloudKit sync configuration
        let description = container.persistentStoreDescriptions.first
        description?.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        description?.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)

        container.loadPersistentStores { (storeDescription, error) in
            if let error = error as NSError? {
                fatalError("Unresolved error \(error), \(error.userInfo)")
            }
        }

        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy

        return container
    }()

    var context: NSManagedObjectContext {
        return persistentContainer.viewContext
    }

    func save() {
        let context = persistentContainer.viewContext

        if context.hasChanges {
            do {
                try context.save()
            } catch {
                let nserror = error as NSError
                fatalError("Unresolved error \(nserror), \(nserror.userInfo)")
            }
        }
    }
}

// MARK: - Flight Entity Extension
extension Flight {
    func toDomain() -> Models.Flight {
        return Models.Flight(
            id: self.id ?? "",
            airlineCode: self.airlineCode ?? "",
            airlineName: self.airlineName ?? "",
            flightNumber: self.flightNumber ?? "",
            route: Models.FlightRoute(
                origin: Models.Airport(
                    code: self.originCode ?? "",
                    name: self.originName ?? "",
                    city: self.originCity ?? "",
                    country: self.originCountry,
                    terminal: self.originTerminal,
                    gate: self.originGate,
                    latitude: self.originLatitude?.doubleValue,
                    longitude: self.originLongitude?.doubleValue
                ),
                destination: Models.Airport(
                    code: self.destinationCode ?? "",
                    name: self.destinationName ?? "",
                    city: self.destinationCity ?? "",
                    country: self.destinationCountry,
                    terminal: self.destinationTerminal,
                    gate: self.destinationGate,
                    latitude: self.destinationLatitude?.doubleValue,
                    longitude: self.destinationLongitude?.doubleValue
                )
            ),
            times: Models.FlightTimes(
                scheduledDeparture: self.scheduledDeparture ?? "",
                scheduledArrival: self.scheduledArrival ?? "",
                estimatedDeparture: self.estimatedDeparture,
                estimatedArrival: self.estimatedArrival,
                actualDeparture: self.actualDeparture,
                actualArrival: self.actualArrival
            ),
            status: Models.FlightStatus(rawValue: self.status ?? "SCHEDULED") ?? .scheduled,
            delayMinutes: self.delayMinutes?.intValue,
            aircraft: self.aircraftType != nil ? Models.AircraftInfo(type: self.aircraftType!, registration: self.aircraftRegistration) : nil,
            baggage: self.baggageClaim != nil ? Models.BaggageInfo(claim: self.baggageClaim!) : nil,
            lastUpdated: self.lastUpdated ?? Date().ISO8601String()
        )
    }
}

// MARK: - Core Data+Flight.swift
import CoreData

extension Flight {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<Flight> {
        return NSFetchRequest<Flight>(entityName: "Flight")
    }

    @NSManaged public var id: String?
    @NSManaged public var airlineCode: String?
    @NSManaged public var airlineName: String?
    @NSManaged public var flightNumber: String?
    @NSManaged public var status: String?
    @NSManaged public var scheduledDeparture: String?
    @NSManaged public var scheduledArrival: String?
    @NSManaged public var estimatedDeparture: String?
    @NSManaged public var estimatedArrival: String?
    @NSManaged public var actualDeparture: String?
    @NSManaged public var actualArrival: String?
    @NSManaged public var delayMinutes: NSNumber?
    @NSManaged public var aircraftType: String?
    @NSManaged public var aircraftRegistration: String?
    @NSManaged public var baggageClaim: String?
    @NSManaged public var lastUpdated: String?

    // Origin fields
    @NSManaged public var originCode: String?
    @NSManaged public var originName: String?
    @NSManaged public var originCity: String?
    @NSManaged public var originCountry: String?
    @NSManaged public var originTerminal: String?
    @NSManaged public var originGate: String?
    @NSManaged public var originLatitude: NSNumber?
    @NSManaged public var originLongitude: NSNumber?

    // Destination fields
    @NSManaged public var destinationCode: String?
    @NSManaged public var destinationName: String?
    @NSManaged public var destinationCity: String?
    @NSManaged public var destinationCountry: String?
    @NSManaged public var destinationTerminal: String?
    @NSManaged public var destinationGate: String?
    @NSManaged public var destinationLatitude: NSNumber?
    @NSManaged public var destinationLongitude: NSNumber?

    @NSManaged public var tracked: Bool
    @NSManaged public var createdAt: Date?
    @NSManaged public var updatedAt: Date?
}

// MARK: - TrackedFlight Repository
class TrackedFlightRepository {
    private let context: NSManagedObjectContext

    init(context: NSManagedObjectContext = CoreDataStack.shared.context) {
        self.context = context
    }

    func fetchTrackedFlights() -> [Flight] {
        let request: NSFetchRequest<Flight> = Flight.fetchRequest()
        request.predicate = NSPredicate(format: "tracked == YES")
        request.sortDescriptors = [NSSortDescriptor(key: "scheduledDeparture", ascending: true)]

        do {
            return try context.fetch(request)
        } catch {
            print("Error fetching tracked flights: \(error)")
            return []
        }
    }

    func addTrackedFlight(_ flight: Models.Flight) {
        let entity = Flight(context: context)
        entity.id = flight.id
        entity.airlineCode = flight.airlineCode
        entity.airlineName = flight.airlineName
        entity.flightNumber = flight.flightNumber
        entity.status = flight.status.rawValue
        entity.scheduledDeparture = flight.times.scheduledDeparture
        entity.scheduledArrival = flight.times.scheduledArrival
        entity.estimatedDeparture = flight.times.estimatedDeparture
        entity.estimatedArrival = flight.times.estimatedArrival
        entity.tracked = true
        entity.createdAt = Date()
        entity.updatedAt = Date()

        // Map route data
        entity.originCode = flight.route.origin.code
        entity.originName = flight.route.origin.name
        entity.originCity = flight.route.origin.city
        entity.originCountry = flight.route.origin.country
        entity.originTerminal = flight.route.origin.terminal
        entity.originGate = flight.route.origin.gate
        if let lat = flight.route.origin.latitude {
            entity.originLatitude = NSNumber(value: lat)
        }
        if let lon = flight.route.origin.longitude {
            entity.originLongitude = NSNumber(value: lon)
        }

        entity.destinationCode = flight.route.destination.code
        entity.destinationName = flight.route.destination.name
        entity.destinationCity = flight.route.destination.city
        entity.destinationCountry = flight.route.destination.country
        entity.destinationTerminal = flight.route.destination.terminal
        entity.destinationGate = flight.route.destination.gate
        if let lat = flight.route.destination.latitude {
            entity.destinationLatitude = NSNumber(value: lat)
        }
        if let lon = flight.route.destination.longitude {
            entity.destinationLongitude = NSNumber(value: lon)
        }

        CoreDataStack.shared.save()
    }

    func removeTrackedFlight(id: String) {
        let request: NSFetchRequest<Flight> = Flight.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", id)

        do {
            let results = try context.fetch(request)
            if let flight = results.first {
                flight.tracked = false
                CoreDataStack.shared.save()
            }
        } catch {
            print("Error removing tracked flight: \(error)")
        }
    }

    func updateFlight(_ flight: Models.Flight) {
        let request: NSFetchRequest<Flight> = Flight.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", flight.id)

        do {
            let results = try context.fetch(request)
            if let entity = results.first {
                entity.status = flight.status.rawValue
                entity.estimatedDeparture = flight.times.estimatedDeparture
                entity.estimatedArrival = flight.times.estimatedArrival
                entity.actualDeparture = flight.times.actualDeparture
                entity.actualArrival = flight.times.actualArrival
                entity.delayMinutes = flight.delayMinutes != nil ? NSNumber(value: flight.delayMinutes!) : nil
                entity.lastUpdated = flight.lastUpdated
                entity.updatedAt = Date()

                if let gate = flight.route.destination.gate {
                    entity.destinationGate = gate
                }

                CoreDataStack.shared.save()
            }
        } catch {
            print("Error updating flight: \(error)")
        }
    }
}
