import express from 'express'
import cors from 'cors'
import fleetRoutes from './routes/fleets'
import sessionRoutes from './routes/sessions'
import robotRoutes from './routes/robots'
import maintenanceRoutes from './routes/maintenance'
import eventRoutes from './routes/events'

const app = express()
app.use(cors({origin: 'http://localhost:5173'}))
app.use(express.json())


app.use('/api/fleets', fleetRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/robots', robotRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/events', eventRoutes)

const PORT = 3001

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})