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
                role: randomElement(['ADMIN', 'ACREDITADOR', 'GUARDIA']),
                isActive: true
            });
        }
        await bulkCreateInBatches(User, usersData);
        console.log(`Created ${usersData.length} users.`);

        // 2. Events
        const eventsData = [];
        for (let i = 0; i < 100; i++) {
            eventsData.push({
                name: `Event ${generateRandomString(5)}`,
                description: `Description for event ${i}`,
                startDate: randomDate(new Date(2025, 0, 1), new Date(2025, 11, 31)),
                endDate: randomDate(new Date(2026, 0, 1), new Date(2026, 11, 31)),
                location: `Location ${i}`,
                maxCapacity: randomInt(50, 500),
                isActive: true,
                createdBy: adminId
            });
        }
        await bulkCreateInBatches(Event, eventsData);
        const allEvents = await Event.findAll();
        console.log(`Created ${eventsData.length} events.`);

        // 3. Event Schedules
        const schedulesData = [];
        for (const event of allEvents) {
            const numSchedules = randomInt(1, 3);
            let startDate = new Date(randomDate(new Date('2022-01-01'), new Date('2025-12-31')));
            for (let j = 0; j < numSchedules; j++) {
                const start = new Date(startDate);
                start.setHours(randomInt(8, 18), 0, 0);
                const end = new Date(start);
                end.setHours(start.getHours() + randomInt(1, 4));

                schedulesData.push({
                    eventId: event.id,
                    scheduleName: `Schedule ${j + 1}`,
                    startDateTime: start,
                    endDateTime: end,
                    maxCapacity: event.maxCapacity,
                    isActive: true,
                    createdBy: adminId
                });
                startDate = randomDate(new Date(startDate.getTime() + 86400000), new Date('2025-12-31'));
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
                createdBy: adminId
            });
        }
        await bulkCreateInBatches(Participant, participantsData);
        const allParticipants = await Participant.findAll();
        console.log(`Created ${participantsData.length} participants.`);

        console.log('Assigning participants to schedules and creating guests, accreditations, and awards...');
        
        // 6. Participant Schedules
        const participantSchedulesData = [];
        
        // Optimization: Pre-calculate schedule IDs to avoid accessing property in loop
        // const allScheduleIds = allSchedules.map(s => s.id); // Not strictly needed if we use objects, but cleaner.
        
        for (const participant of allParticipants) {
            // Assign random number of schedules (e.g., 1 to 5, or up to allSchedules.length)
            // Original code had randomInt(100, 300) which might be > allSchedules.length.
            // Let's cap it at allSchedules.length.
            const maxSchedules = Math.min(allSchedules.length, randomInt(1, 5)); // Reduced for realism/speed, or keep high if needed?
            // User asked for "cantidad parecida de registros". 
            // If original was 100-300, and we have ~200 schedules, it means "assign almost all schedules".
            // Let's assume we want a lot of assignments.
            const targetCount = Math.min(allSchedules.length, randomInt(50, 150)); 
            
            const selectedSchedules = sampleSize(allSchedules, targetCount);

            for (const schedule of selectedSchedules) {
                participantSchedulesData.push({
                    participantId: participant.id,
                    scheduleId: schedule.id,
                    assignedAt: new Date(),
                    assignedBy: adminId
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
                email: `guest_${generateRandomString(8)}@example.com`,
                createdBy: adminId
            });
        }
        await bulkCreateInBatches(Guest, guestsData);
        const allGuests = await Guest.findAll();
        console.log(`Created ${guestsData.length} guests.`);

        // 8. Accreditations
        const accreditationsData = [];
        const accreditationSet = new Set<string>(); // To ensure uniqueness: scheduleId-participantId or scheduleId-guestId

        const participantScheduleUpdates = [];
        // We want ~100,000 accreditations.
        // We should pick random (Schedule, Person) pairs.
        // Person can be Participant or Guest.
        
        let attempts = 0;
        const MAX_ATTEMPTS = 200000; // Safety break
        
        while (accreditationsData.length < 100000 && attempts < MAX_ATTEMPTS) {
            attempts++;
            const schedule = randomElement(allSchedules);
            const isGuest = Math.random() > 0.7 && allGuests.length > 0;
            
            let participantId = null;
            let guestId = null;

            if (isGuest) {
                const guest = randomElement(allGuests);
                guestId = guest.id;
                participantId = guest.participantId; // Assuming guest is linked to participant
            } else {
                const participant = randomElement(allParticipants);
                participantId = participant.id;
            }

            // Unique constraint is on (participantId, eventScheduleId)
            const key = `S${schedule.id}-P${participantId}`;

            if (!accreditationSet.has(key)) {
                accreditationSet.add(key);

                // Generate checkInTime within schedule bounds
                const minTime = new Date(schedule.startDateTime).getTime();
                const maxTime = new Date(schedule.endDateTime).getTime();
                const checkInTime = new Date(minTime + Math.random() * (maxTime - minTime));

                accreditationsData.push({
                    eventScheduleId: schedule.id,
                    participantId: participantId,
                    guestId: guestId,
                    checkInTime: checkInTime,
                    accreditedBy: adminId
                });

                // Update ParticipantSchedule to set isAccredited = true
                participantScheduleUpdates.push({
                    participantId: participantId,
                    scheduleId: schedule.id,
                    isAccredited: true
                });
            }
        }
        
        await bulkCreateInBatches(Accreditation, accreditationsData);
        await bulkUpdateInBatches(ParticipantSchedule, participantScheduleUpdates, ['participantId', 'scheduleId']);
        console.log(`Created ${accreditationsData.length} accreditations.`);

        // 9. Participant Awards
        const participantAwardsData = [];
        const usedPairs = new Set();

        for (let i = 0; i < 100; i++) {
            const award = randomElement(allAwards);
            const participant = randomElement(allParticipants);
            const key = `${participant.id}-${award.id}`;

            if (!usedPairs.has(key)) {
                usedPairs.add(key);
                participantAwardsData.push({
                    participantId: participant.id,
                    awardId: award.id,
                    assignedBy: adminId,
                    deliveredAt: Math.random() > 0.5 ? new Date() : null,
                    deliveredBy: Math.random() > 0.5 ? adminId : null
                });
            }
        }
        await bulkCreateInBatches(ParticipantAward, participantAwardsData);
        console.log(`Created participant awards.`);

        console.log('Seeding completed successfully.');
        await transactions.commit();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        await transactions.rollback();
        process.exit(1);
    }
};

seedData();