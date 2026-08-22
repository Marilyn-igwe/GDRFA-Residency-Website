import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import referenceRoutes from './routes/reference.js'
import availabilityRoutes from './routes/availability.js'
import appointmentRoutes from './routes/appointments.js'
import chatbotRoutes from './routes/chatbot.js'
import humanitarianRoutes from './routes/humanitarian.js'
import documentRoutes from './routes/documents.js'
import familyRoutes from './routes/family.js'
import staffRoutes from './routes/staff.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
// Higher limit than the default 100kb — document uploads are base64-encoded
// images/PDFs and need real headroom.
app.use(express.json({ limit: '15mb' }))

app.use('/api', referenceRoutes)
app.use('/api', availabilityRoutes)
app.use('/api', appointmentRoutes)
app.use('/api', chatbotRoutes)
app.use('/api', humanitarianRoutes)
app.use('/api', documentRoutes)
app.use('/api', familyRoutes)
app.use('/api', staffRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`GDRFA booking API running on http://localhost:${PORT}`)
})
