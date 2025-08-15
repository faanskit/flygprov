import { schedule } from "@netlify/functions";
import connectToDatabase from "../src/database";
import { User } from "../src/models/User";
import { TestAttempt } from "../src/models/TestAttempt";
import { Subject } from "../src/models/Subject";
import { subDays } from "date-fns";
import { ObjectId } from "mongodb";

const GRACE_PERIOD_DAYS = parseInt(process.env.GRACE_PERIOD_DAYS || "30", 10);

export const handler = schedule("0 0 * * *", async () => {
    try {
        const { db } = await connectToDatabase();
        const usersCollection = db.collection<User>('users');
        const testAttemptsCollection = db.collection<TestAttempt>('test_attempts');
        const subjectsCollection = db.collection<Subject>('subjects');

        console.log(`Starting scheduled function: archive-students. Grace period: ${GRACE_PERIOD_DAYS} days.`);

        // 1. Get all active students
        const activeStudents = await usersCollection.find({ role: 'student', archived: false }).toArray();
        if (!activeStudents.length) {
            console.log("No active students found. Exiting.");
            return { statusCode: 200, body: "No active students to process." };
        }

        // 2. Get total number of subjects
        const totalSubjects = await subjectsCollection.countDocuments();
        if (totalSubjects === 0) {
            console.log("No subjects found in the database. Cannot determine completion status. Exiting.");
            return { statusCode: 200, body: "No subjects found." };
        }
        console.log(`Total number of subjects in the system: ${totalSubjects}`);

        let archivedCount = 0;
        // 3. Process each student
        for (const student of activeStudents) {
            // Get the count of unique subjects the student has passed
            const passedSubjects = await testAttemptsCollection.distinct('subjectId', {
                studentId: student._id, // CORRECTED: Was userId
                passed: true
            });

            console.log(`Student ${student._id} (${student.username}) has passed ${passedSubjects.length} subjects.`);

            if (passedSubjects.length >= totalSubjects) {
                // Student has passed all subjects, check grace period
                const lastPassedTestCursor = testAttemptsCollection.find({
                    studentId: student._id, // CORRECTED: Was userId
                    passed: true
                }).sort({ submittedAt: -1 }).limit(1);

                const lastPassedTest = await lastPassedTestCursor.next();

                if (lastPassedTest && lastPassedTest.submittedAt) {
                    const gracePeriodEndDate = subDays(new Date(), GRACE_PERIOD_DAYS);
                    if (new Date(lastPassedTest.submittedAt) < gracePeriodEndDate) {
                        // Grace period has passed, archive the student
                        await usersCollection.updateOne({ _id: student._id }, { $set: { archived: true } });
                        console.log(`Archived student ${student._id} (${student.username}).`);
                        archivedCount++;
                    } else {
                        console.log(`Student ${student._id} has passed all tests, but is still within the grace period.`);
                    }
                }
            }
        }

        console.log(`Finished scheduled function: archive-students. Archived ${archivedCount} students.`);
        return {
            statusCode: 200,
            body: `Successfully processed students. Archived ${archivedCount} students.`
        };

    } catch (error) {
        console.error("Error in archive-students scheduled function:", error);
        return {
            statusCode: 500,
            body: "An error occurred while processing students for archiving."
        };
    }
});
