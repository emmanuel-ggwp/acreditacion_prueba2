import { sequelize } from '../src/lib/sequelize';
import {
    User,
    Event,
    EventSchedule,
    Participant,
    Guest,
    Award,
    ParticipantAward,
    Accreditation,
    ParticipantSchedule
} from '../src/models';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Optimized randomElement (O(1))
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// Helper to pick n random unique elements from array
const sampleSize = <T>(arr: T[], n: number): T[] => {
    const len = arr.length;
    if (n >= len) return [...arr]; // Return copy of all if n >= length
    
    // If n is small relative to length, pick random indices
    if (n < len / 2) {
        const result = new Set<T>();
        while (result.size < n) {
            result.add(arr[Math.floor(Math.random() * len)]);
        }
        return Array.from(result);
    }
    
    // If n is large, shuffle a copy (Fisher-Yates)
    const shuffled = [...arr];
    for (let i = len - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, n);
};

const firstNames = ['Juan', 'Maria', 'Pedro', 'Ana', 'Luis', 'Sofia', 'Carlos', 'Lucia', 'Miguel', 'Elena', 'Diego', 'Valentina', 'Javier', 'Camila', 'Andres', 'Isabella'];
const lastNames = ['Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Reyes'];
const companies = ['TechCorp', 'InnovateLtda', 'GlobalSolutions', 'CreativeMinds', 'FutureSystems', 'AlphaIndustries', 'BetaLogistics', 'OmegaServices'];
const positions = ['Developer', 'Manager', 'Designer', 'Director', 'Analyst', 'Consultant', 'Engineer', 'Coordinator'];
const dietaryPreferences = ['NONE', 'VEGETARIAN', 'VEGAN', 'CELIAC', 'KOSHER', 'HALAL', 'OTHER'];
const registrationSources = ['MANUAL', 'IMPORT', 'PUBLIC_FORM'];
const scheduleStatuses = ['published', 'accrediting', 'accredited', 'cancelled'];

const generateRandomString = (length: number) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// Batch helper: insert large arrays in chunks to avoid memory/transaction issues
const BATCH_SIZE = 5000;
const bulkCreateInBatches = async (model: any, data: any[]) => {
    console.log(`Seeding ${data.length} records into ${model.name} in batches of ${BATCH_SIZE}...`);
    if (!data || data.length === 0) return;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const chunk = data.slice(i, i + BATCH_SIZE);
        // console.log(`Inserting batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} records) into ${model.name}...`);
        await model.bulkCreate(chunk);
    }
    console.log(`Finished ${model.name}.`);
};
const bulkUpdateInBatches = async (model: any, data: any[], whereKeys: string[]) => {
    console.log(`Updating ${data.length} records in ${model.name} in batches of ${BATCH_SIZE}...`);
    if (!data || data.length === 0) return;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const chunk = data.slice(i, i + BATCH_SIZE);
        // console.log(`Updating batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} records) in ${model.name}...`);
        await Promise.all(chunk.map(async (item) => {
            const whereClause: any = {};
            whereKeys.forEach(key => {
                whereClause[key] = item[key];
            });
            await model.update(item, { where: whereClause });
        }));
    }
    console.log(`Finished updating ${model.name}.`);
};

const seedData = async () => {
    const transactions = await sequelize.transaction();
    try {
        
        await sequelize.authenticate();
        console.log('Database connection established.');

        console.log('Starting seed...');

        // 1. Users
        let adminUser = await User.findOne({ where: { role: 'ADMIN' } });
        let adminId: string;

        if (!adminUser) {
            const newAdmin = await User.create({
                username: 'admin_seed',
                email: 'admin_seed@example.com',
                password: 'password123',
                firstName: 'Admin',
                lastName: 'Seed',
                role: 'ADMIN',
                isActive: true
            });
            adminId = newAdmin.id;
            console.log('Admin user created.');
        } else {
            adminId = adminUser.id;
            console.log('Admin user already exists.');
        }

        const usersData = [];
        for (let i = 0; i < 100; i++) {
            usersData.push({
                username: `user_${generateRandomString(8)}`,
                email: `user_${generateRandomString(8)}@example.com`,
                password: 'password123',
                firstName: randomElement(firstNames),
                lastName: randomElement(lastNames),
                role: randomElement(['ADMIN', 'OPERATOR', 'GUARDIA']),
                isActive: true
            });
        }
        await bulkCreateInBatches(User, usersData);
        console.log(`Created ${usersData.length} users.`);

        // 2. Events
        const eventsData = [];
        for (let i = 0; i < 100; i++) {
            const name = `Event ${generateRandomString(5)}`;
            eventsData.push({
                name: name,
                description: `Description for event ${i}`,
                location: `Location ${i}`,
                maxCapacity: randomInt(50, 500),
                isActive: true,
                createdBy: adminId,
                publicSlug: name.toLowerCase().replace(/\s+/g, '-') + '-' + generateRandomString(4),
                publicTemplate: 'default',
                isPublic: Math.random() > 0.5,
                registrationConfig: { fields: ['firstName', 'lastName', 'email', 'company'] }
            });
        }
        await bulkCreateInBatches(Event, eventsData);
        const allEvents = await Event.findAll();
        console.log(`Created ${eventsData.length} events.`);

        // 3. Event Schedules
        const schedulesData = [];
        for (const event of allEvents) {
            const numSchedules = randomInt(1, 3);
            
            // Generate a random base date for this event's schedules (sometime in 2025)
            const baseDate = randomDate(new Date(2025, 0, 1), new Date(2025, 11, 31));
            let currentScheduleDate = new Date(baseDate);
            
            for (let j = 0; j < numSchedules; j++) {
                const start = new Date(currentScheduleDate);
                start.setHours(randomInt(8, 18), 0, 0); // Start between 8am and 6pm
                
                const end = new Date(start);
                end.setHours(start.getHours() + randomInt(1, 4)); // Duration 1-4 hours

                const now = new Date();
                let status = 'published';
                if (end < now) {
                    status = 'accredited';
                } else if (start <= now && now <= end) {
                    status = 'accrediting';
                }

                schedulesData.push({
                    eventId: event.id,
                    scheduleName: `Schedule ${j + 1}`,
                    startDateTime: start,
                    endDateTime: end,
                    maxCapacity: event.maxCapacity,
                    isActive: true,
                    status: status
                });
                
                // Move to next day for the next schedule
                currentScheduleDate = new Date(currentScheduleDate.getTime() + 86400000);
            }
        }
        await bulkCreateInBatches(EventSchedule, schedulesData);
        const allSchedules = await EventSchedule.findAll();
        console.log(`Created ${schedulesData.length} schedules.`);

        // 4. Awards
        const awardsData = [];
        for (let i = 0; i < 100; i++) {
            const event = randomElement(allEvents);
            awardsData.push({
                eventId: event.id,
                name: `Award ${generateRandomString(5)}`,
                description: `Award description ${i}`,
                quantity: randomInt(5, 50),
                createdBy: adminId
            });
        }
        await bulkCreateInBatches(Award, awardsData);
        const allAwards = await Award.findAll();
        console.log(`Created ${awardsData.length} awards.`);

        // 5. Participants
        const participantsData = [];
        for (let i = 0; i < 2000; i++) {
            participantsData.push({
                firstName: randomElement(firstNames),
                lastName: randomElement(lastNames),
                email: `participant_${generateRandomString(8)}@example.com`,
                phone: `+1${randomInt(100000000, 999999999)}`,
                company: randomElement(companies),
                position: randomElement(positions),
                allowedGuests: randomInt(0, 2),
                createdBy: adminId,
                documentNumber: generateRandomString(10),
                numeroSap: generateRandomString(8),
                dietaryPreference: randomElement(dietaryPreferences),
                dietaryComments: null,
                registrationSource: randomElement(registrationSources),
                isNew: Math.random() > 0.8
            });
        }
        await bulkCreateInBatches(Participant, participantsData);
        const allParticipants = await Participant.findAll();
        console.log(`Created ${participantsData.length} participants.`);

        console.log('Assigning participants to schedules and creating guests, accreditations, and awards...');
        
        // 6. Participant Schedules
        const participantSchedulesData = [];
        
        for (const participant of allParticipants) {
            const targetCount = Math.min(allSchedules.length, randomInt(50, 150)); 
            
            const selectedSchedules = sampleSize(allSchedules, targetCount);

            for (const schedule of selectedSchedules) {
                participantSchedulesData.push({
                    participantId: participant.id,
                    scheduleId: schedule.id,
                    attended: false,
                    attendedAt: null
                });
            }
        }
        console.log(`Total participant-schedule assignments to create: ${participantSchedulesData.length}`);
        await bulkCreateInBatches(ParticipantSchedule, participantSchedulesData);
        console.log(`Assigned participants to schedules.`);

        // 7. Guests
        const guestsData = [];
        for (let i = 0; i < 1000; i++) {
            const participant = randomElement(allParticipants);
            guestsData.push({
                participantId: participant.id,
                firstName: randomElement(firstNames),
                lastName: randomElement(lastNames),
                documentNumber: generateRandomString(10)
            });
        }
        await bulkCreateInBatches(Guest, guestsData);
        const allGuests = await Guest.findAll();
        console.log(`Created ${guestsData.length} guests.`);

        // 8. Accreditations
        const accreditationsData = [];
        const accreditationSet = new Set<string>(); 
        const participantScheduleUpdates = [];
        
        // Map participants to their guests for quick lookup
        const participantGuestsMap = new Map<string, any[]>();
        allGuests.forEach(g => {
             if (!participantGuestsMap.has(g.participantId)) {
                 participantGuestsMap.set(g.participantId, []);
             }
             const guests = participantGuestsMap.get(g.participantId);
             if (guests) {
                 guests.push(g);
             }
        });

        // Map schedules for date access
        const scheduleMap = new Map(allSchedules.map(s => [s.id, s]));

        let attempts = 0;
        const MAX_ATTEMPTS = 200000;
        
        while (accreditationsData.length < 100000 && attempts < MAX_ATTEMPTS) {
            attempts++;
            
            // Pick a random valid registration
            if (participantSchedulesData.length === 0) break;
            const registration = randomElement(participantSchedulesData);
            const schedule = scheduleMap.get(registration.scheduleId);
            
            if (!schedule) continue;

            // Check if already accredited for this schedule
            const key = `${registration.participantId}-${registration.scheduleId}`;
            if (accreditationSet.has(key)) continue;

            // Determine if we accredit the participant or one of their guests
            const guests = participantGuestsMap.get(registration.participantId) || [];
            const isGuestAccreditation = guests.length > 0 && Math.random() > 0.7; // 30% chance if guests exist

            let guestId = null;
            if (isGuestAccreditation) {
                const guest = randomElement(guests);
                guestId = guest.id;
                // Guest accreditation key
                const guestKey = `G-${guest.id}-${registration.scheduleId}`;
                if (accreditationSet.has(guestKey)) continue;
                accreditationSet.add(guestKey);
            } else {
                accreditationSet.add(key);
            }

            const checkInTime = new Date(schedule.startDateTime.getTime() + randomInt(-30 * 60000, 60 * 60000)); // -30m to +60m
            
            accreditationsData.push({
                participantId: registration.participantId,
                guestId: guestId,
                eventScheduleId: registration.scheduleId,
                accreditedBy: adminId,
                accreditedAt: checkInTime,
                checkInTime: checkInTime,
                checkOutTime: Math.random() > 0.5 ? new Date(checkInTime.getTime() + randomInt(30 * 60000, 4 * 60 * 60000)) : null,
                notes: Math.random() > 0.9 ? 'Late arrival' : null
            });

            // If it's the participant (not guest), update their schedule status
            if (!guestId) {
                participantScheduleUpdates.push({
                    participantId: registration.participantId,
                    scheduleId: registration.scheduleId,
                    attended: true,
                    attendedAt: checkInTime
                });
            }
        }

        await bulkCreateInBatches(Accreditation, accreditationsData);
        console.log(`Created ${accreditationsData.length} accreditations.`);

        // Update ParticipantSchedule statuses
        await bulkUpdateInBatches(ParticipantSchedule, participantScheduleUpdates, ['participantId', 'scheduleId']);

        // 9. Participant Awards (Randomly assign awards to accredited participants)
        const participantAwardsData = [];
        const accreditedParticipants = accreditationsData.filter(a => !a.guestId); // Only participants get awards
        const assignedAwards = new Set<string>();
        
        for (const acc of accreditedParticipants) {
            if (Math.random() > 0.8) { // 20% chance to get an award
                // Find awards for this event
                const schedule = scheduleMap.get(acc.eventScheduleId);
                if (!schedule) continue;
                
                const eventAwards = allAwards.filter(a => a.eventId === schedule.eventId);
                if (eventAwards.length === 0) continue;

                const award = randomElement(eventAwards);
                const key = `${acc.participantId}-${award.id}`;

                if (assignedAwards.has(key)) continue;
                assignedAwards.add(key);
                
                participantAwardsData.push({
                    participantId: acc.participantId,
                    awardId: award.id,
                    assignedBy: adminId,
                    deliveredAt: new Date(),
                    deliveredBy: adminId
                });
            }
        }
        await bulkCreateInBatches(ParticipantAward, participantAwardsData);
        console.log(`Created ${participantAwardsData.length} participant awards.`);

        await transactions.commit();
        console.log('Seed completed successfully.');
        process.exit(0);
    } catch (error) {
        await transactions.rollback();
        console.error('Seed failed:', error);
        process.exit(1);
    }
};

seedData();